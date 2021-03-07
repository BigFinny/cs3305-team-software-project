// Firebase App (the core Firebase SDK) is always required and must be listed first
import firebase from "firebase/app";
// If you are using v7 or any earlier version of the JS SDK, you should import firebase using namespace import
// import * as firebase from "firebase/app"
// Add the Firebase products that you want to use
import "firebase/auth";
import "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBsRA7R4Wbf_M2aKmJeDdf421UsSkVAT0g",
  authDomain: "project-970041699397464178.firebaseapp.com",
  projectId: "project-970041699397464178",
  storageBucket: "project-970041699397464178.appspot.com",
  messagingSenderId: "485046157660",
  appId: "1:485046157660:web:b5bb4607c80d94b1b18199"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const actionCodeSettings = {
    url: "https://project-970041699397464178.web.app/Login",
    handleCodeInApp: false,
}

export var firebaseRegister = function(fname, sname, email, pass, username) {
    return new Promise(function(resolve, reject)
    {
    let recaptcha = new firebase.auth.RecaptchaVerifier('recaptcha');
    recaptcha.verify().then(() => {
        //console.log("reCAPTCHA verified")
        auth.createUserWithEmailAndPassword(email, pass).then(userCred => {
            //console.log("User created successfully");
            //console.log(userCred.user.email, userCred.user.emailVerified);
            addNewUserToFirestore(userCred.user.uid, fname, sname, userCred.user.email, username);
            userCred.user.sendEmailVerification(actionCodeSettings).then(() => {
                //console.log("Verification email sent");
                recaptcha.clear();
                resolve(true)
            }).catch(error => {
                //console.log("Send email verification error catch", error.code);
                recaptcha.clear();
                reject(error.code);
            })
        }).catch(error => {
            //console.log("Create user error catch", error.code);
            recaptcha.clear();
            reject(error.code);
        })
    }).catch(error => {
        //console.log("Outermost verify error catch", error.code);
        recaptcha.clear();
        reject(error.code);
    })
    });
}

export var firebaseRegularLogIn = function(email, pass) {
    return new Promise(function(resolve, reject) {
        var returnValue = {
            user: 0,
            customData: 0
        };
        auth.signInWithEmailAndPassword(email, pass)
        .then(userCred => {
            returnValue.user = userCred.user;
            var ref = db.doc('users/'+auth.currentUser.uid);
            ref.get()
                .then((userDoc) => {
                    var customData = {
                        email: userDoc.data().email,
                        name: userDoc.data().fname + " " + userDoc.data().sname,
                        bio: userDoc.data().bio
                    }
                    returnValue.customData = customData;    
                })
            console.log(returnValue);
            resolve(returnValue);
            }).catch(error => {
                reject(error.code);
            })})
    
}

function addNewUserToFirestore(uid, fname, sname, email, username) {
    console.log("Registering user:", uid, email);
    db.collection('users').doc(uid).set({ // the 'users/userID' in firestore will
    // later be used to track what elections a user has voted in, and the ones they've organised
      username: username,
      email: email,
      fname: fname,
      sname: sname
    }).catch(error => {return error.code})
  
}

export var firebaseGoogleLogIn= function() {
    return new Promise(function(resolve, reject) {
        let provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider)
            .then((userCred) => {
                addNewUserToFirestore(userCred.user.uid, userCred.user.email);
                resolve(userCred);
            }).catch((error) => {
                reject(error.code);
            });  

    })
    
}

export var firebaseTwitterLogIn= function() {
    return new Promise(function(resolve, reject){
    let provider = new firebase.auth.TwitterAuthProvider(); 
    auth.signInWithPopup(provider)
        .then((result) => {
            addNewUserToFirestore(result.user.uid, result.user.email);
            resolve(result)
        }).catch((error) => {
            reject(error.code);
        }); 
    })
}

export var firebaseFacebookLogIn= function() {
    return new Promise(function(resolve, reject){
        let provider = new firebase.auth.FacebookAuthProvider();
        auth.signInWithPopup(provider)
        .then((result) => {
            addNewUserToFirestore(result.user.uid, result.user.email);
            resolve(result)
        }).catch((error) => {
            reject(error.code);
        }); 

    })
}

export var Logout= function() {
    return new Promise(function(resolve, reject){
        auth.signOut().then(() => {
            resolve(true);
        })
        .catch(error =>{
            reject(error.code);
        })

    })
}

export function userState() {
    if (auth.currentUser) {
        return auth.currentUser
    }
    else {
        return false
    }
}