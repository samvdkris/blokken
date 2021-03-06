let input = <HTMLInputElement>document.getElementsByClassName("answer")[0];
let notification = <HTMLDivElement>document.getElementsByClassName("notification")[0];
let progress_bar = <HTMLProgressElement>document.getElementsByTagName("progress")[0];
let timer_display = <HTMLDivElement>document.getElementById("timer");

const POMODORO_TIME = 25;
const POMODORO_BREAK_TIME = 3;

// Level 0: new block
// Level 1: hard (seen, but wrong on first try)
// Level 2: familiar (correct on first try)
// Level 3: known
// Level 4: known well
class Question {
	from: string;
	to: string;
	level: number = null;
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

	progress_bar.value = 0;
	queue_len = queue.length;

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

	progress_bar.value = 100 - (queue.length / queue_len * 100);

	setTimeout(function() {
		notification.setAttribute("show", "false");
		nextQuestion();
	}, delay);
}


function forceCorrect() {
	notification.innerHTML = "Correct!";
	notification.setAttribute("color", "good");
	if (currentQuestion.level < 4) currentQuestion.level++;
	if (currentQuestion.level < 4) currentQuestion.level++;  // Increase level twice to compensate decrease
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
	let xhr = new XMLHttpRequest();
	xhr.open("POST", "/api/storeprogress/"+id);
	xhr.setRequestHeader("X-CSRFToken", getCookie("csrftoken"));
	xhr.send(JSON.stringify(questions));
}


function debug_levels() {
	for (let q of questions) {
		console.log(q.from + " " + q.level);
	}
}


function timer(secs, max_time, mode) {
	if (secs === max_time*60) {
		if (mode === "LEREN") { alert("You can take a break now."); timer(0, POMODORO_BREAK_TIME, "PAUZE"); }
		else { alert("Time to start learning again!"); timer(0, POMODORO_TIME, "LEREN"); }
	}
	else {
		let secs_left = max_time*60 - secs;
		let timer_mins = Math.floor(secs_left / 60);
		let timer_secs = (secs_left - timer_mins*60).toString();
		timer_secs = ("00" + timer_secs).slice(-2);
		timer_display.innerHTML = `${mode} ${timer_mins}:${timer_secs}`;

		setTimeout(function() {
			timer(++secs, max_time, mode);
		}, 1000);
	}
}




// Hook keyboard enter
input.addEventListener("keyup", function(e){
	if (e.keyCode === 13) {
		checkAnswer(input.value);
	}
});



let questions = [];
let blocks = [];
let queue = [];
let queue_len = 0;
let currentQuestion: Question = null;
let lastQuestion: Question = null;

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

	timer(0, POMODORO_TIME, "LEREN");
}