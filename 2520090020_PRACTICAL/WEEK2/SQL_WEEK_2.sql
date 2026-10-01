USE bookflow_db;

CREATE TABLE Loans (
    loan_id INT PRIMARY KEY,
    member_id INT,
    book_id INT,
    loan_date DATE,
    FOREIGN KEY (member_id) REFERENCES members(member_id),
    FOREIGN KEY (book_id) REFERENCES books(book_id)
);

INSERT INTO Loans (loan_id, member_id, book_id, loan_date) VALUES
(1, 1, 1, '2025-01-05'),
(2, 2, 2, '2025-01-08'),
(3, 3, 3, '2025-01-10'),
(4, 1, 2, '2025-02-01'),
(5, 2, 1, '2025-02-05'),
(6, 3, 2, '2025-02-12'),
(7, 1, 3, '2025-03-01'),
(8, 2, 3, '2025-03-07'),
(9, 3, 1, '2025-03-15'),
(10, 1, 1, '2025-04-01');

SELECT * FROM Loans;

SELECT m.full_name AS Member_Name,
       b.title AS Book_Title
FROM Loans l
INNER JOIN members m ON l.member_id = m.member_id
INNER JOIN books b ON l.book_id = b.book_id;

SELECT published_year,
       COUNT(book_id) AS Total_Books
FROM books
GROUP BY published_year
ORDER BY published_year;