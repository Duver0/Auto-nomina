module.exports = {
  baseUrl: 'https://srvpsp.policia.gov.co:8443',
  loginUrl: '/Login.aspx',
  timeout: 30000,
  headless: true,
  browserArgs: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
  ],
  selectors: {
    username: '#txtUsuario',
    password: '#txtClave',
    submitButton: '#btnIngresar',
  },
};