const setOTPExpiration = (minutes = 10) => {
  // Set OTP expiration time (default 10 minutes)
  const now = new Date();
  return new Date(now.getTime() + minutes * 60000);
};

module.exports = { setOTPExpiration };
