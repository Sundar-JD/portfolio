function startTyping(lines){
const output=document.getElementById("terminal-output");
let i=0;
function typeLine(){
if(i>=lines.length)return;
let line=document.createElement("div");
output.appendChild(line);
let text=lines[i];
let j=0;
function typeChar(){
if(j<text.length){
line.innerHTML+=text[j];
j++;
setTimeout(typeChar,20);
}else{
i++;
setTimeout(typeLine,200);
}}
typeChar();
}
typeLine();
}
