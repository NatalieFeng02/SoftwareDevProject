INSERT INTO users
    (id, username, email, password)
VALUES
    (5, 'testuser5', 'test5@colorado.edu', 'test123') returning *;