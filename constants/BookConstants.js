// Book Inventory System Constants
// Enhanced system for Kings College of Marbel library catalog

export const SHELF_LOCATIONS = [
  { id: "Fi-college", name: "College", description: "College collection" },
  { id: "Fi/senH", name: "Senior High School", description: "Senior High School collection" },
  { id: "Fi/HS", name: "High School", description: "High School collection" },
  { id: "Fi/E", name: "Elementary", description: "Elementary collection" },
  { id: "Fi/K", name: "Kindergarten", description: "Kindergarten collection" }
];

export const COURSE_PROGRAMS = [
  { id: "BEED", name: "Bachelor of Elementary Education" },
  { id: "BSED", name: "Bachelor of Secondary Education" }
];

export const SUBJECTS_BY_LEVEL = {
  "Fi/K": [
    "Language Development",
    "Basic Mathematics", 
    "Social Studies",
    "Arts & Crafts",
    "Physical Education"
  ],
  "Fi/E": [
    "Language Arts",
    "Mathematics",
    "Science", 
    "Social Studies",
    "Values Education",
    "MAPEH",
    "Technology & Livelihood Education"
  ],
  "Fi/HS": [
    "English",
    "Filipino",
    "Mathematics",
    "Science",
    "Social Studies", 
    "MAPEH",
    "Technology & Livelihood Education",
    "Values Education"
  ],
  "Fi/senH": [
    "Core Subjects",
    "Applied Subjects",
    "Specialized Subjects (STEM)",
    "Specialized Subjects (HUMSS)", 
    "Specialized Subjects (ABM)",
    "Specialized Subjects (GAS)"
  ],
  "Fi": [
    "General Education",
    "Professional Education",
    "Specialization Courses",
    "Research Methods",
    "Field Study",
    "Practice Teaching"
  ]
};

export const BOOK_STATUSES = {
  AVAILABLE: "Available",
  BORROWED: "Borrowed", 
  RESERVED: "Reserved",
  DAMAGED: "Damaged",
  LOST: "Lost",
  REFERENCE: "Reference Only"
};

export const BOOK_CONDITIONS = {
  EXCELLENT: "Excellent",
  GOOD: "Good",
  FAIR: "Fair", 
  POOR: "Poor"
};

// Default values for new books
export const DEFAULT_BOOK_OPTIONS = {
  shelfLocationPrefix: "Fi",
  courseProgram: null,
  isBorrowable: true,
  callNumber: "",
  year: new Date().getFullYear()
};
