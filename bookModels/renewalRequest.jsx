class RenewalRequest {
  constructor(id, book, requestDate, status) {
    this.id = id;
    this.book = book; // Book object
    this.requestDate = requestDate;
    this.status = status; // e.g., "Pending Renew", "Renew Cancelled", "Approved"
  }
}

export default RenewalRequest;