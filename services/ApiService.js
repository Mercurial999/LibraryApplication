export default class ApiService {
    static async registerBorrower(borrower) {
      // Here you would usually send a request to your backend server.
      // We'll simulate a delay.
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (!borrower.email.includes('@')) {
            reject("Invalid email address.");
          } else {
            resolve("Registration successful, pending approval.");
          }
        }, 1500);
      });
    }
  }
  