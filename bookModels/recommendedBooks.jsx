class RecommendedBook {
  constructor(id, title, author, ddc, shelf, status, coverUrl) {
    this.id = id;
    this.title = title;
    this.author = author;
    this.ddc = ddc;
    this.shelf = shelf;
    this.status = status; // "Available", "Borrowed", etc.
    this.coverUrl = coverUrl;
  }
}

export default RecommendedBook;