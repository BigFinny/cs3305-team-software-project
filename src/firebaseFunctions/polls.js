import firebase from "firebase/app";
import "firebase/auth";
const auth = firebase.auth();
const db = firebase.firestore();


export function createPoll(name, description, anon, options) {
    return new Promise((resolve, reject) => {
        var date = new Date()
        db.doc('users/' + auth.currentUser.uid).get()
            .then((userObj) => {
                var organiserName = userObj.data().fname + " " + userObj.data().sname;
                db.collection('/polls').doc(auth.currentUser.uid + name).set({
                        poll_name: name,
                        poll_name_insensitive: name.toLowerCase(),
                        anonymousVoting: anon,
                        description: description,
                        owners: [auth.currentUser.uid],
                        type: "poll",
                        winner: "None",
                        organiser: organiserName,
                        organiser_insensitive: organiserName.toLowerCase(),
                        open: true,
                        createdAt: date.getDate() + "/" + date.getMonth() + 1 + "/" + date.getFullYear()
                    })
                    .then(() => {
                        for (var i = 0; i < options.length; i++) {
                            db.collection('/polls').doc(auth.currentUser.uid + name).collection("options").doc('option' + i).set({
                                option_name: options[i],
                                votes: 0
                            })
                        }
                        resolve(true)
                    })
                    .catch(error => {
                        console.log("something went wrong while creating the poll")
                        reject(error)
                    })
            })
    })
}

export function searchPoll(searchString) {
    return new Promise((resolve, reject) => {
        var results = []
        var count = 0
        db.collection('polls/').where('poll_name_insensitive', '>=', searchString.toLowerCase()).where('poll_name_insensitive', '<=', searchString.toLowerCase() + '~').get()
            .then((snapshot) => {
                snapshot.docs.forEach(doc => {
                    var poll = {
                        type: doc.data().type,
                        data: {
                            title: doc.data().poll_name,
                            organiser: doc.data().organiser,
                            ownerId: doc.data().owners[0],
                            winner: doc.data().winner,
                            voteCode: count
                        }
                    }
                    if (count>=24) {
                        resolve(results)
                    }
                    count = count + 1;
                    results.push(poll);
                    })
                    db.collection('polls/').where('organiser_insensitive', '>=', searchString.toLowerCase()).where('organiser_insensitive', '<=', searchString.toLowerCase() + '~').get()
                    .then((snapshot) => {
                        snapshot.docs.forEach(doc => {
                            var poll = {
                                type: doc.data().type,
                                data: {
                                    title: doc.data().poll_name,
                                    organiser: doc.data().organiser,
                                    ownerId: doc.data().owners[0],
                                    winner: doc.data().winner,
                                    voteCode: count
                                    }
                                }
                                if (count>=24) {
                                    resolve(results)
                                }
                                count = count + 1;
                                results.push(poll);
                            })
                        resolve(results)
                        })
                        .catch(error => {
                            reject(error)
                        }) 
            }).catch(error => {
                reject(error)
            })

        })
}

export function pollsForUser() {
    return new Promise((resolve, reject) => {
        var userPolls = [];
        var count = 0;
        db.collection('polls/').where("owners", "array-contains", auth.currentUser.uid).get()
            .then((snapshot) => {
                snapshot.forEach(doc => {
                    var poll = {
                        type: doc.data().type,
                        data: {
                            title: doc.data().poll_name,
                            organiser: doc.data().organiser,
                            ownerId: doc.data().owners[0],
                            winner: doc.data().winner,
                            open: doc.data().open,
                            anon: doc.data().anonymousVoting,
                            voteCode: count
                        }
                    }
                    count = count + 1;
                    userPolls.push(poll);
                })
            }).catch((error) => {
                reject(false)
            })
        resolve(userPolls);
    })
}


export function getPoll(pollID) {
    return new Promise((resolve, reject) => {
        var returnValue = {
            poll: null,
            options: null
        }
        db.doc('polls/' + pollID).get()
            .then((poll) => {
                returnValue.poll = poll
            })
            .catch(error => {
                reject(error)
            })
        db.collection('polls/' + pollID + '/options').get()
            .then((snapshot) => {
                var optionArray = []
                snapshot.forEach(option => {
                    optionArray.push(option);
                })
                returnValue.options = optionArray;
                resolve(returnValue);
            })
            .catch(error => {
                reject(error)
            })
    })
}

export function vote(optionName, pollId) {
    return new Promise((resolve, reject) => {
        db.doc('polls/' + pollId).get()
            .then((pollDoc) => {
                var anonVoting = pollDoc.data().anonymousVoting
                db.collection('polls/' + pollId + '/options/').where('option_name', '==', optionName).get()
                    .then((querySnapshot) => {
                        let option = querySnapshot.docs[0]
                        if (anonVoting === true && auth.currentUser === null) {
                            reject("Not verified")
                        } else if (pollDoc.data().open === false) {
                            reject("Poll closed")
                        } else if (anonVoting === false) {
                            var optionToInc = db.doc('/polls/' + pollDoc.id + '/options/' + option.id)
                            optionToInc.update({
                                votes: firebase.firestore.FieldValue.increment(1)
                            }).then(()=>{
                                calculateWinner(pollDoc)
                                resolve("New vote registered")

                            })
                            
                        } else {
                            db.collection('users/' + auth.currentUser.uid + '/polls/')
                                .get()
                                .then((querySnapshot) => {
                                    var hasUserVotedBefore = false
                                    querySnapshot.forEach((pollVote) => {
                                        if (pollVote.id === pollDoc.id && pollVote.data().option === option.id) {
                                            //console.log("you've already voted in this election and for this candidate")
                                            hasUserVotedBefore = true
                                            reject('Already voted for this option')

                                        } else if (pollVote.id === pollDoc.id && pollVote.data().option !== option.id) {
                                            //console.log("changed vote")
                                            db.collection('users/' + auth.currentUser.uid + '/polls/').doc(pollDoc.id).set({
                                                option: option.id
                                            })
                                            var candidateToInc = db.doc('/polls/' + pollDoc.id + '/options/' + option.id)
                                            candidateToInc.update({
                                                votes: firebase.firestore.FieldValue.increment(1)
                                            })
                                            var candidateToDec = db.doc('/polls/' + pollDoc.id + '/options/' + pollVote.data().option)
                                            candidateToDec.update({
                                                votes: firebase.firestore.FieldValue.increment(-1)
                                            }).then(()=>{
                                                calculateWinner(pollDoc)
                                                resolve("New vote registered")
                                                hasUserVotedBefore = true
                
                                            })
                                        }
                                      
                                    })
                                    if (hasUserVotedBefore === false) {
                                        //console.log('newVote')
                                        db.collection('users/' + auth.currentUser.uid + '/polls/').doc(pollDoc.id).set({
                                            option: option.id
                                        })
                                        var optionToInc = db.doc('/polls/' + pollDoc.id + '/options/' + option.id)
                                        optionToInc.update({
                                            votes: firebase.firestore.FieldValue.increment(1)
                                        }).then(()=>{
                                            calculateWinner(pollDoc)
                                            resolve("New vote registered")
            
                                        })
                                        
                                    }
                                })
                        }
                    })
            })
    })
}

export function calculateWinner(poll) {
    var isTie;
    var maxVotes = 0;
    var winner;
    var newWinner = false
    db.collection('/polls/' + poll.id + '/options/').get()
        .then((options) => {
            options.docs.forEach(option => {
                if (option.data().votes>maxVotes) {
                    console.log(option.data().option_name, option.data().votes);
                    maxVotes = option.data().votes;
                    winner = option.data().option_name;
                    isTie = false;
                    newWinner = true;
                }
                else if (option.data().votes === maxVotes && maxVotes !==0) {
                    console.log("tie", option.data().option_name);
                    console.log(maxVotes, option.data().votes)
                    isTie = true;
                    newWinner = false;
                }
            })
            console.log(newWinner)
            if (newWinner) {
                db.doc('polls/' + poll.id).update({
                    winner: winner
                });
            }
            else if (isTie) {
                db.doc('polls/' + poll.id).update({
                    winner: "Draw"
                });

            }
        })

}

export function close(poll) {
    db.doc('/polls/' + poll.id).get()
        .then((queryPoll) => {
            if (queryPoll.data().owners.includes(auth.currentUser.uid)) {
                db.doc('/polls/' + poll.id).update({
                    open: false
                })
            } else {
                console.log("you lack privelege to do this");
            }
        })
}


export function createPollLink(ownerId, pollName) {
    let base = '/vote/'
    base = base.concat(ownerId)
    base = base.concat(pollName)
    return base
}

export function hasUserAlreadyVoted(pollId) {
    return new Promise((resolve, reject) => {
        db.collection('users/' + auth.currentUser.uid + '/polls/').get()
            .then((querySnapshot) => {
                querySnapshot.forEach((pollVote) => {
                    if (pollVote.id === pollId) {
                        resolve(pollVote.data().option)
                    }
                })
                resolve(false)
            })
            .catch(error => {
                console.log("ERROR FINDING VOTE")
                console.log(error)
                reject(error)
            })
    })
}