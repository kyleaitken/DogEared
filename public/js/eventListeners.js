const form = document.getElementById('login_form');
const registerForm = document.getElementById('register_form');
// const addToFavouritesButton = document.getElementById('addToFavouritesButton');

if (form) {
    form.addEventListener('submit', (event) => {
        event.preventDefault(); // Prevent default form submission behavior
        loginRequest(event);
        // else if (event.target.id === 'go_to_register') registerRequest();
    });
}

if (registerForm) {
    registerForm.addEventListener('submit', (event) => {
        event.preventDefault();
        registerUser(event);
    })
    
}
