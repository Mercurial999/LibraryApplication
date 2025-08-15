class BorrowRequest {
  constructor(id, book, requestDate, status) {
    this.id = id;
    this.book = book; // Book object
    this.requestDate = requestDate;
    this.status = status; // e.g., "Pending", "Ready for Pickup", "Cancelled"
  }
}

export default BorrowRequest;