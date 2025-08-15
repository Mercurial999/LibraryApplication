class Book {
  constructor(id, title, author, subject, ddc, shelfLocation, availability, coverImage) {
    this.id = id;
    this.title = title;
    this.author = author;
    this.subject = subject;
    this.ddc = ddc;
    this.shelfLocation = shelfLocation;
    this.availability = availability; // e.g., "Available: 1 copy", "Unavailable"
    this.coverImage = coverImage; // optional: image path or URL
  }
}

export default Book;