const items = document.querySelectorAll(".item");


//https://dev.to/okonkwomandy/the-easiest-way-to-build-the-pinterest-layout-without-using-a-framework-3i0g0

// The number of columns is assigned to this variable
const numCols = 2;

// The masonry container is assigned to this variable
const masonryCon = document.querySelector(".boxes-con");

// The masonry container elements is assigned to this variable
const list = document.querySelectorAll(".boxes");

// The number of columns will be used to create HTML div elements that are appended to the masonry container
for (var i = 1; i < numCols + 1; i++) {
  let elem = document.createElement("div");
  elem.classList.add("sub");
  elem.classList.add("box" + i);
  masonryCon.append(elem);
}

// An array ranging from 0 to number of columns is created
thearray = [...Array(numCols).keys()];

// An array that would contain the list of main elements would be created
themainarray = [];

// A variable is defined
let timesBy;

// The variable is assigned to a number that will determine the length of the mainarray
if (list.length % numCols == 0) {
  timesBy = Math.floor(list.length / numCols);
} else {
  timesBy = Math.ceil(list.length / numCols);
}

// The main array will contain would contain positions that the list would be assigned to
for (var j = 0; j < timesBy; j++) {
  themainarray.push(...thearray);
}

// The div elements that created based on the number of columns are assigned to variable
subs = document.querySelectorAll(".sub");

// The elements are assigned to their position based on the number of columns
for (var b = 0; b < themainarray.length; b++) {
  subs[themainarray[b]].appendChild(list[b]); //subs[0].appendChild(list[0])
}

// for responsiveness, get the the width of the device
function pageWidth() {
  return window.innerWidth != null
    ? window.innerWidth
    : document.documentElement && document.documentElement.clientWidth
      ? document.documentElement.clientWidth
      : document.body != null
        ? document.body.clientWidth
        : null;
}

width = pageWidth();