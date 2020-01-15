let input = <HTMLInputElement>document.getElementsByClassName("answer")[0];
let notification = <HTMLDivElement>document.getElementsByClassName("notification")[0];

// Level 0: new block
// Level 1: hard (seen, but wrong on first try)
// Level 2: familiar (correct on first try)
// Level 3: known
// Level 4: known well
class Question {
	from: string;
	to: string;
	level: number = null;  // TODO: get question data from two sources (List->question for [from,to], Test->progress for [level,noRepeat,extraRepeat])
	noRepeat: boolean = false;
	extraRepeat: boolean = false;
	constructor(from: string, to: string) {
		this.from = from;
		this.to = to;
	}
}


function shuffle(arr) {
	return arr.sort(() => Math.random() - 0.5);
}


/**
 * Divides a question array in blocks that can then be used for Leitner System stuff
 * @param questions array of Question objects
 * @param blockLength number of questions in a block
 */
function blockify(questions: Question[], blockLength: number) {
	let blocks = [];
	for (let block = 0; block < Math.ceil(questions.length / blockLength); block++) {  // Create blocks
		blocks[block] = [];
		for (let i = 0; i < blockLength; i++) {  // Fill block with blockLength amount of questions
			let index = block*blockLength +  i;
			let question = questions[index];
			if (question) blocks[block].push(question);
		}
	}
	return blocks;
}


// Check if a question with a certain level exists in the questions array
function checkLevel(level: number) {
	for (const question of questions) {
		if (question.level <= level) return true;
	}
	return false;
}


// Mode 1: repeat level 1
// Mode 2: repeat level 1, 2
// Mode 3: repeat level 1, 2, 3
// Mode 4: repeat level 1, 2, 3, 4
let mode: number = 1;

function updateQueue() {
	if (blocks) {
		let block = blocks.pop();
		if (block) queue = queue.concat(block);  // Add block to queue
	}

	while (!checkLevel(mode)) {
		if (mode === 4) mode = 1; else mode++;  // Increment mode and flip back to 0 when at 4
	}

	for (const question of questions) {  // Add all questions with a level under the mode
		if (question.level && question.level <= mode) {
			queue.push(question);
		}
	}

	if (mode === 4) mode = 1; else mode++;  // Increment mode and flip back to 0 when at 4
	questions = shuffle(questions);  // Randomise question order every time a new queue is added
	return queue;
}


function checkAnswer(answer) {
	let correct = currentQuestion.to.toLowerCase() === answer.toLowerCase();
	let delay = 1000;

	if (currentQuestion.level === null) currentQuestion.level = 1;
	if (correct) {
		notification.innerHTML = "Correct!";
		notification.setAttribute("color", "good");
		if (currentQuestion.level < 4) currentQuestion.level++;
	}
	else {
		notification.innerHTML = `Wrong! The correct answer was: ${currentQuestion.to}`;
		notification.setAttribute("color", "bad");
		delay = 2000;
		if (currentQuestion.level > 1) currentQuestion.level--;
	}
	notification.setAttribute("show", "true");
	setTimeout(function() {
		notification.setAttribute("show", "false");
		nextQuestion();
	}, delay);
}


function nextQuestion() {
	while (queue.length === 0) {
		queue = updateQueue();
	}
	currentQuestion = queue.pop();
	document.getElementsByClassName("question")[0].innerHTML = currentQuestion.from;
	input.value = "";

	storeProgress();
}


function storeProgress() {
	xhr.open("POST", "/api/storeprogress/"+id);
	xhr.setRequestHeader("X-CSRFToken", getCookie("csrftoken"));
	xhr.send(JSON.stringify(questions));
}


function debug_levels() {
	for (let q of questions) {
		console.log(q.from + " " + q.level);
	}
}




input.addEventListener("keyup", function(e){
	if (e.keyCode === 13) {
		checkAnswer(input.value);
	}
});



let questions = [];
let blocks = [];
let queue = [];
let currentQuestion: Question = null;

let id = window.location.hash.substr(1);
let url = "/api/getlisttest/" + id;
let xhr = new XMLHttpRequest();
xhr.open("GET", url);
xhr.responseType = "json";
xhr.send();
xhr.onload = function() {
	let res = xhr.response;
	if (navigator.userAgent.indexOf("Trident") > -1) {  // Fuck you, IE
		res = JSON.parse(res);
	}

	// Initialise things
	questions = shuffle(res.response);
	blocks = blockify(questions, 3);

	queue = updateQueue();
	nextQuestion();
}