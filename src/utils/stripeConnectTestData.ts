
export const TEST_DATA = {
  dates: {
    successfulVerification: '1901-01-01',
    immediateVerification: '1902-01-01',
    ofacAlert: '1900-01-01',
  },
  addresses: {
    fullMatch: 'address_full_match',
    noMatch: 'address_no_match',
    line1NoMatch: 'address_line1_no_match',
  },
  idNumbers: {
    success: '000000000',
    identityMismatch: '111111111',
    immediateSuccess: '222222222',
  },
  fileTokens: {
    documentSuccess: 'file_identity_document_success',
    documentFailure: 'file_identity_document_failure',
  },
  businessTaxIds: {
    success: '000000000',
    nonProfit: '000000001',
    mismatch: '111111111',
    notIssued: '111111112',
    immediate: '222222222',
  },
  urls: {
    success: 'https://accessible.stripe.com',
    disallowed: 'https://disallowed.stripe.com',
    geoblocked: 'https://geoblocked.stripe.com',
    problem: 'https://problem.stripe.com',
    missing: 'https://missing.stripe.com',
    mismatch: 'https://mismatch.stripe.com',
    passwordProtected: 'https://passwordprotected.stripe.com',
    underConstruction: 'https://underconstruction.stripe.com',
    inaccessible: 'https://inaccessible.stripe.com',
  },
  smsCode: '000000',
};

export const isTestMode = () => {
  return process.env.NODE_ENV === 'development';
};

export const getTestDataForEnvironment = (field: keyof typeof TEST_DATA) => {
  if (!isTestMode()) {
    console.warn('Attempted to use test data in production environment');
    return null;
  }
  return TEST_DATA[field];
};

export const validateTestData = (data: any) => {
  if (!isTestMode()) return true;

  const validations = {
    dob: (date: string) => Object.values(TEST_DATA.dates).includes(date),
    address: (address: string) => Object.values(TEST_DATA.addresses).includes(address),
    idNumber: (id: string) => Object.values(TEST_DATA.idNumbers).includes(id),
    businessTaxId: (id: string) => Object.values(TEST_DATA.businessTaxIds).includes(id),
    url: (url: string) => Object.values(TEST_DATA.urls).includes(url),
  };

  return Object.entries(data).every(([key, value]) => {
    if (key in validations) {
      return validations[key as keyof typeof validations](value as string);
    }
    return true;
  });
};
