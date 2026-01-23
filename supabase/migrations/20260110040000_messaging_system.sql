-- Messaging System Migration
-- Created: January 10, 2026
-- Purpose: In-app messaging between landlords and tenants

-- ============================================
-- CONVERSATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  landlord_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  subject TEXT,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  landlord_unread_count INTEGER DEFAULT 0,
  tenant_unread_count INTEGER DEFAULT 0,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(landlord_id, tenant_id, unit_id)
);

-- ============================================
-- MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text', -- text, image, file, system
  attachment_url TEXT,
  attachment_name TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CHECK-INS TABLE (Periodic tenant satisfaction)
-- ============================================
CREATE TABLE IF NOT EXISTS check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE NOT NULL,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  rating TEXT NOT NULL CHECK (rating IN ('good', 'neutral', 'bad')),
  comment TEXT,
  triggered_by TEXT DEFAULT 'payment', -- payment, scheduled, manual
  payment_id UUID REFERENCES rent_payments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_conversations_landlord ON conversations(landlord_id);
CREATE INDEX idx_conversations_tenant ON conversations(tenant_id);
CREATE INDEX idx_conversations_property ON conversations(property_id);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);
CREATE INDEX idx_messages_unread ON messages(conversation_id, read_at) WHERE read_at IS NULL;

CREATE INDEX idx_check_ins_tenant ON check_ins(tenant_id);
CREATE INDEX idx_check_ins_property ON check_ins(property_id);
CREATE INDEX idx_check_ins_created ON check_ins(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;

-- Conversations: Only participants can see
CREATE POLICY "Users can view their conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = landlord_id OR auth.uid() = tenant_id);

CREATE POLICY "Users can create conversations they participate in"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = landlord_id OR auth.uid() = tenant_id);

CREATE POLICY "Users can update their conversations"
  ON conversations FOR UPDATE
  USING (auth.uid() = landlord_id OR auth.uid() = tenant_id);

-- Messages: Only conversation participants can see
CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (c.landlord_id = auth.uid() OR c.tenant_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their conversations"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
      AND (c.landlord_id = auth.uid() OR c.tenant_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own messages"
  ON messages FOR UPDATE
  USING (auth.uid() = sender_id);

-- Check-ins: Tenant can create/view own, landlord can view for their properties
CREATE POLICY "Tenants can view their check-ins"
  ON check_ins FOR SELECT
  USING (
    auth.uid() = tenant_id OR
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = check_ins.property_id
      AND (p.created_by = auth.uid() OR p.property_manager_id = auth.uid())
    )
  );

CREATE POLICY "Tenants can create check-ins"
  ON check_ins FOR INSERT
  WITH CHECK (auth.uid() = tenant_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update conversation metadata when message sent
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
DECLARE
  conv RECORD;
BEGIN
  -- Get conversation details
  SELECT * INTO conv FROM conversations WHERE id = NEW.conversation_id;

  -- Update conversation
  UPDATE conversations SET
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.content, 100),
    landlord_unread_count = CASE
      WHEN NEW.sender_id = conv.tenant_id THEN landlord_unread_count + 1
      ELSE landlord_unread_count
    END,
    tenant_unread_count = CASE
      WHEN NEW.sender_id = conv.landlord_id THEN tenant_unread_count + 1
      ELSE tenant_unread_count
    END,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_conversation_on_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_message();

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_read(p_conversation_id UUID, p_user_id UUID)
RETURNS void AS $$
DECLARE
  conv RECORD;
BEGIN
  -- Get conversation to determine if user is landlord or tenant
  SELECT * INTO conv FROM conversations WHERE id = p_conversation_id;

  -- Mark messages as read (only messages NOT sent by this user)
  UPDATE messages SET read_at = NOW()
  WHERE conversation_id = p_conversation_id
  AND sender_id != p_user_id
  AND read_at IS NULL;

  -- Reset unread count for this user
  IF p_user_id = conv.landlord_id THEN
    UPDATE conversations SET landlord_unread_count = 0 WHERE id = p_conversation_id;
  ELSIF p_user_id = conv.tenant_id THEN
    UPDATE conversations SET tenant_unread_count = 0 WHERE id = p_conversation_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ENABLE REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
