function loginRequest(event) {
    // sends request to server to authenticate 
    console.log('login request function')
    const usernameField = document.getElementById("username");
    const passwordField = document.getElementById("password");
    const username = usernameField.value;
    const password = passwordField.value;
    console.log("username: " + username)
    console.log("password: " + password)

    fetch('/authenticate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: username, password: password })
      })
      .then(response => {
        if (response.ok) {
          // If the response indicates success, redirect to the appropriate page
          console.log('got response for login')
          window.location.href = '/';
        }
      })
      .catch(error => {
        // Handle any errors that occur during the authentication process
        console.error('Authentication error:', error);
        // You might display an error message to the user here
        const errorMessage = document.getElementById("error-message");
        errorMessage.innerHTML = "<strong>Error:</strong> Invalid username or password.";
      });

}


function registerUser() {
    // sends request to add user into DB
    console.log('register request function')
    const usernameField = document.getElementById("reg_username");
    const passwordField = document.getElementById("reg_password");
    const username = usernameField.value;
    const password = passwordField.value;
    console.log("username: " + username)
    console.log("password: " + password)


    fetch('/registerUser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: username, password: password })
      })
      .then(response => {
        if (response.ok) {
          console.log('got response');
          // If the response indicates success, redirect to the appropriate page
          if (response.redirected) {
            window.location.href = response.url;
          }
        } else {
          // If the response indicates an error, throw an error with the status text
          throw new Error(response.statusText);
        }
      })
      .catch(error => {
        // Handle any errors that occur during the authentication process
        console.error('Authentication error:', error);
        // You might display an error message to the user here
        const errorMessage = document.getElementById("error-message");
        errorMessage.innerHTML = "<strong>Error:</strong> Invalid username or password.";
      });

}

function addToFavourites(bookId) {
  console.log('in add to favourites client side');

  fetch(`/addFavourite/${bookId}`)
    .then(response => {
      if (!response.ok) {
        alert('This book is already in your favorites!');
      } else {
        alert('Book added to favorites!');
      }
    })
    .catch(error => {
      console.error(error);
      alert('Error adding book to favorites');
    });
}


function removeFromFavourites(bookID) {
  console.log("in remove favourite client side");
  console.log('book id: ' + bookID);

  fetch(`/removeFavourite/${bookID}`, {
    method: 'DELETE'
  })
  .then(response => {
    if (response.ok) {
      // location.reload();
        console.log('Book successfully removed from favourites');
        alert('Book successfully removed from favourites');
        window.location.reload();


    } else {
      alert('Could not remove from favourites')
    }
  })
  .catch(error => {
    console.error(error);
    alert('Error removing book from favorites');
  });

}
