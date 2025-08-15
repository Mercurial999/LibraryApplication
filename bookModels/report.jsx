class Report {
  constructor(id, book, type, description, dateSubmitted, status) {
    this.id = id;
    this.book = book; // Book object
    this.type = type; // "Lost" or "Damaged"
    this.description = description;
    this.dateSubmitted = dateSubmitted;
    this.status = status; // "Pending", "Resolved", etc.
  }
}

export default Report;