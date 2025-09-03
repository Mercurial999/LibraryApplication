class Book {
  constructor(id, title, author, subject, ddc, shelfLocation, availability, coverImage, options = {}) {
    this.id = id;
    this.title = title;
    this.author = author;
    this.subject = subject;
    this.ddc = ddc;
    this.shelfLocation = shelfLocation;
    this.availability = availability; // e.g., "Available: 1 copy", "Unavailable"
    this.coverImage = coverImage; // optional: image path or URL
    
    // NEW ENHANCED FIELDS
    this.shelfLocationPrefix = options.shelfLocationPrefix || "Fi"; // "Fi", "Fi/HS", "Fi/E", "Fi/K", "Fi/senH"
    this.courseProgram = options.courseProgram || null; // "BEED", "BSED", or null
    this.isBorrowable = options.isBorrowable !== false; // true for borrowable, false for reference
    this.callNumber = options.callNumber || ""; // Individual call number
    this.year = options.year || new Date().getFullYear(); // Publication year
    
    // COMPUTED FIELDS
    this.fullCallNumber = this.generateFullCallNumber();
    this.displayStatus = this.generateDisplayStatus();
  }

  // Generate full call number combining all components
  generateFullCallNumber() {
    const parts = [
      this.shelfLocationPrefix,
      this.ddc,
      this.callNumber,
      this.year
    ].filter(Boolean);
    return parts.join(" ");
  }

  // Generate display status for UI
  generateDisplayStatus() {
    if (!this.isBorrowable) {
      return "Reference Only";
    }
    return this.availability || "Available";
  }

  // Check if book is available for borrowing
  isAvailableForBorrow() {
    return this.isBorrowable && this.availability && this.availability.includes("Available");
  }

  // Get shelf location display name
  getShelfLocationDisplay() {
    const locationMap = {
      "Fi": "College",
      "Fi/senH": "Senior High School", 
      "Fi/HS": "High School",
      "Fi/E": "Elementary",
      "Fi/K": "Kindergarten"
    };
    return locationMap[this.shelfLocationPrefix] || this.shelfLocationPrefix;
  }

  // Get course program display name
  getCourseProgramDisplay() {
    const programMap = {
      "BEED": "Bachelor of Elementary Education",
      "BSED": "Bachelor of Secondary Education"
    };
    return programMap[this.courseProgram] || this.courseProgram;
  }
}

export default Book;