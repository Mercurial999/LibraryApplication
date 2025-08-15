class BookRequest {
  constructor(id, title, author, ddc, subject, reason, date, status) {
    this.id = id;
    this.title = title;
    this.author = author;
    this.ddc = ddc;
    this.subject = subject;
    this.reason = reason;
    this.date = date;
    this.status = status; // "Pending", "Approved", etc.
  }
}

export default BookRequest;