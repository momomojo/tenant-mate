
-- Check if the enum type already exists
DO $$
BEGIN
    -- Drop existing trigger first to avoid conflicts
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    
    -- Drop existing function if it exists
    DROP FUNCTION IF EXISTS public.handle_new_user();
    
    -- Drop existing user_role type if it exists
    DROP TYPE IF EXISTS public.user_role;
    
    -- Create the user_role type
    CREATE TYPE public.user_role AS ENUM ('admin', 'property_manager', 'tenant');
    
    -- Create the handle_new_user function
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER SET search_path = ''
    AS $$
    DECLARE
        role_val text;
    BEGIN
        -- Get the role from metadata
        role_val := NEW.raw_user_meta_data->>'role';
        
        -- Insert with proper casting, defaulting to 'tenant' if null or invalid
        INSERT INTO public.profiles (
            id, 
            email, 
            first_name, 
            last_name, 
            role, 
            created_at, 
            updated_at
        )
        VALUES (
            NEW.id,
            NEW.email,
            NEW.raw_user_meta_data->>'first_name',
            NEW.raw_user_meta_data->>'last_name',
            CASE 
                WHEN role_val IN ('admin', 'property_manager', 'tenant') THEN role_val::public.user_role
                ELSE 'tenant'::public.user_role
            END,
            NOW(),
            NOW()
        );
        
        RETURN NEW;
    END;
    $$;
    
    -- Create the trigger
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
END
$$;

-- Verify that the type exists now
DO $$
DECLARE
    type_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'user_role'
    ) INTO type_exists;
    
    IF type_exists THEN
        RAISE NOTICE 'user_role enum type exists and is valid';
    ELSE
        RAISE EXCEPTION 'Failed to create user_role enum type!';
    END IF;
END
$$;
