// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
import { getFirestore } from "firebase/firestore";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js";
import { getAuth, createMakeWithInformation } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBFpfyYMfgAlyozywN27mkCM8NODcUntOA",
  authDomain: "cherrysapp-de82f.firebaseapp.com",
  projectId: "cherrysapp-de82f",
  storageBucket: "cherrysapp-de82f.firebasestorage.app",
  messagingSenderId: "662896896244",
  appId: "1:662896896244:web:4a7d8adf1364e3229c16a1",
  measurementId: "G-YLY36ZVKKV"
}; 



// >> inside firebase config file

// init storage service
const Storage = getStorage(app)
export { Storage }
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { Storage } from "../../firebase.config"; // NB: define your own path


import { getAuth, updateProfile } from "firebase/auth";
const auth = getAuth();
updateProfile(auth.currentUser, {
  displayName: "Jane Q. User", photoURL: "https://example.com/jane-q-user/profile.jpg"
}).then(() => {
  // Profile updated!
  // ...
}).catch((error) => {
  // An error occurred
  // ...
});


const handleUploadImage = async e => {
    // prevent deafult form submit
    e.preventDefault()

    // get imageInput element inside form
    const imageInput = e.target.imageInput
    // imageInput is an array of files. we choose the fist file (which is image file)
    const imageFile = imageInput.files[0]

    // validate: show alert if no image is selected
    if (!imageFile) {
        alert('please, select a image!')
        return
    }

    // create file path ref for firebase storage. 
    // if image filename is "eagle.jpg"; then the path would be "images/eagle.jpg"
    const filePathRef = ref(currentUser, posts, `images/${imageFile.name}`)

    // upload the image file into firebse storage 
    const uploadResult = await uploadBytes(filePathRef, imageFile)

    // finally get image url which can be used to access image from your website
    const imageUrl = await getDownloadURL(filePathRef)

    // [ TODO: put your code here whatever you want to do with the "imageUrl" ]

    let images = document.getElementById("makePictures").value;
    let titel = document.getElementById("titel").value;
    let omschrijving = document.getElementById("omschrijving").value;
    let niveau = document.getElementById("niveauMake");
    let time = document.getElementById("duur").value;
     createMakeWithInformation(images, titel, omschrijving, niveau, time).then(() => console.log("jeej")).catch((e) => console.log(e))
     console.log (make);

    // reset form (optional)
    e.target.reset()
}


{
    let durationIn = document.getElementById("duration-input");
    let resultP = document.getElementById("output");

    durationIn.addEventListener("change", function (e) {
        resultP.textContent = "";
        durationIn.checkValidity();
    });

    durationIn.addEventListener("invalid", function (e) {
        resultP.textContent = "Invalid input";
    });
}
