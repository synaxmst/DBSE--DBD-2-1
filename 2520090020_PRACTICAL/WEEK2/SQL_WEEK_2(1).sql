CREATE TABLE Donation_History (
    donation_id INT PRIMARY KEY,
    book_id INT,
    donor_name VARCHAR(100),
    donation_date DATE,
    FOREIGN KEY (book_id) REFERENCES books(book_id)
);

START TRANSACTION;

INSERT INTO books (book_id, title, isbn, published_year)
VALUES (4, 'Animal Farm', '9780451526342', 1945);

INSERT INTO Donation_History (donation_id, book_id, donor_name, donation_date)
VALUES (1, 4, 'Raj Kumar', CURDATE());

COMMIT;

CREATE INDEX idx_books_isbn ON books(isbn);

SELECT * FROM books
WHERE isbn = '9780451526342';