class Fine {
  constructor(id, bookTitle, amount, dueDate, status, breakdown) {
    this.id = id;
    this.bookTitle = bookTitle;
    this.amount = amount;
    this.dueDate = dueDate;
    this.status = status; // e.g., "Unpaid", "Paid", "Overdue"
    this.breakdown = breakdown; // { checkOut, due, returned, overdueDays, perDay }
  }
}

export default Fine;