// ********************** Initialize server **********************************

const server = require('../src/index'); //TODO: Make sure the path to your index.js is correctly added
const db = require('../src/index')

// ********************** Import Libraries ***********************************

const chai = require('chai'); // Chai HTTP provides an interface for live integration testing of the API's.
const chaiHttp = require('chai-http');
chai.should();
chai.use(chaiHttp);
const {assert, expect} = chai;

// ********************** DEFAULT WELCOME TESTCASE ****************************

describe('Server!', () => {
  // Sample test case given to test / endpoint.
  it('Returns the default welcome message', done => {
    chai
      .request(server)
      .get('/welcome')
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.status).to.equals('success');
        assert.strictEqual(res.body.message, 'Welcome!');
        done();
      });
  });
});

// *********************** TODO: WRITE 2 UNIT TESTCASES **************************


// Example Positive Testcase :
// API: /add_user
// Input: {id: 5, name: 'John Doe', dob: '2020-02-20'}
// Expect: res.status == 200 and res.body.message == 'Success'
// Result: This test case should pass and return a status 200 along with a "Success" message.
// Explanation: The testcase will call the /add_user API with the following input
// and expects the API to return a status of 200 along with the "Success" message.


describe('Testing register and preexisting username', () => {

    before(done => {
      chai
        .request(server)
        .post('/register')
        .send({username: 'testuser2', email: 'test2@colorado.edu', password: 'test456'})
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.message).to.equals('Registered');
          done();
        });
    });

    it('negative : /register checking existing username', done => {
      chai
        .request(server)
        .post('/register')
        .send({username: 'testuser2', email: 'test2@colorado.edu', password: 'test456'})
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.message).to.equals('Account already exists');
          done();
        });
    });

    after(done => {
      chai
        .request(server)
        .delete('/users')
        .send({username: 'testuser2'})
        .end((err, res) => {
          done();
        })
    })
  });


// Tests that search page is correctly rendering
  describe('Testing Render', () => {
    // Sample test case given to test /test endpoint.
    it('positive: /search route should render with an html response', done => {
      chai
        .request(server)
        .get('/search')
        .end((err, res) => {
          res.should.have.status(200); // Expecting a success status code
          res.should.be.html; // Expecting a HTML response
          done();
        });
    });
  });

  describe('Nonexistent Page', () => {
    it('negative: nonexistent page should throw a 404 error', done => {
      chai
        .request(server)
        .get('/testDemo')
        .end((err, res) => {
          res.should.have.status(404); // Expecting a success status code
          res.should.be.html; // Expecting a HTML response
          done();
        });
    });
  });

// ********************************************************************************