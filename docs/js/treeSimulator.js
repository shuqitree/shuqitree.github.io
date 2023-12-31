/* GRAPH STUFF */
/* This part of codes build a funny combination of multiple photos and you can drag them for fun */

// This part of code is used for changing images every time
Array.prototype.rande = function () {
  return this[Math.floor(Math.random() * this.length)]
}

// may explode
Array.prototype.randes = function (n) {
  const res = new Set()
  while (res.size < n) res.add(this.rande())
  return [...res]
}

const change_images = _ => {
  const imgs = images.randes(nodes.length)
  for (let i = 0; i < imgs.length; i += 1) {
    nodes[i].img = imgs[i]
  }
}



// Random color generator
function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}



// This function helps you change images everytime you click the name title
document.querySelector('#name').addEventListener('click', _ => {
  if (curr_short === 'index')
    change_images()
})



// Function to drag the element
function drag(simulation) {
  let startX, startY; // var used to save the initial 

  function dragstarted(event) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;

    startX = event.subject.x;
    startY = event.subject.y;
    console.log(`Drag started at (${startX}, ${startY})`);
  }

  function dragged(event) {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
  }

  function dragended(event) {
    if (!event.active) simulation.alphaTarget(0);

    let endX = event.subject.x;
    let endY = event.subject.y;
    console.log(`Drag ended at (${endX}, ${endY})`);

    event.subject.fx = null;
    event.subject.fy = null;
  }

  return d3.drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended);
}



// The definition of every element in this simulation
const images = [
  "221024uva.webp",
  "221020uva.webp",
  "221018southlawn.webp",
  "220909uva.webp",
  "220901xbox.webp"
].map(x => `media/node_images/${x}`)

// up is the Y, -90 move to bot, +90 move to top
// over is the X, -90 move to right, +90 moves to left
// It is coordinate system
// Zero point is the top left corner of an image
// const nodes = [
// 	// a在最下，b在左上，c在右上
// 	{ id: "a", height: 400, x: 1000, y: 0, up: '-10%', over: '-90%', img:  "media/node_images/221024uva.webp"},
// 	{ id: "b", height: 400, x: -1000, y: -1300, up: '-90%', over: '-90%', img: "media/node_images/221020uva.webp" },
// 	{ id: 'c', height: 400, x: 1000, y: -1800, up: '-90%', over: '-20%' , img: "media/node_images/220901xbox.webp"},
// 	// { id: 'd', height: 400, x: 300, y: 300, up: '-10%', over: '-60%' },
// 	// { id: "e", height: 280, x: 100, y: -200, up: '-15%', over: '-80%' },
// 	// { id: "f", height: 280, x: -200, y: 200, up: '-10%', over: '-90%' },
// 	// { id: "g", height: 280, x: 0, y: 400, up: '-5%', over: '-85%' },
// ]

// const links = [
// 	{ source: "a", target: "b", distance: 800, xShift: -33, back_dx: -30, back_dy: 0 },
// 	{ source: "b", target: "c", distance: 700, xShift: 33, back_dx: -30, back_dy: 0 },
// 	// { source: "a", target: "c", distance: 800, thick: 8, xShift: 25, back_dx: -20, back_dy: 0 },
// 	// { source: "a", target: "e", distance: 500, thick: 6, xShift: 25, back_dx: -20, back_dy: 0 },
// 	// { source: "f", target: "e", distance: 400, thick: 6, xShift: -15, back_dx: -10, back_dy: 0 },
// 	// { source: "e", target: "g", distance: 400, thick: 6, xShift: 15, back_dx: 10, back_dy: 0 },
// ]



const nodes = [
  { id: "a", height: 600, x: -526.7114978358869, y: -27.954213546407182, up: '-12%', over: '-90%', img: "media/node_images/221024uva.webp" }
    , { id: "b", height: 500, x: 8.059866961236306, y: -481.31970185434225, up: '-88%', over: '-50%', img: "media/node_images/221024uva.webp" }
    , { id: 'c', height: 650, x: 519.2927754935764, y: 505.2944150332749, up: '-12%', over: '-40%', img: "media/node_images/221024uva.webp" }
  ]

const links =
  [{ source: "a", target: "b", distance: 700, thick: 8, xShift: -33, back_dx: -30, back_dy: 0 }
    , { source: "b", target: "c", distance: 1110, thick: 8, xShift: 33, back_dx: -30, back_dy: 0 }
  ]

let floati = 0

function treeSimulation() {
  // note: should be here rn.
  document.querySelector('#content').classList.add('index-content')

  const forceNode = d3.forceManyBody().strength(-Math.sin(floati) * (770 + Math.random() * 4))

  const forceLink = d3.forceLink(links)
    .distance(x => x.distance)
    .id(x => x.id)

  const forceCenter = d3.forceCenter().strength(.05)

  const simulation = d3.forceSimulation(nodes)
    .force("link", forceLink)
    .force("charge", forceNode)
    .force("center", forceCenter)
    .on("tick", ticked)
    .alphaDecay(.001)
    .alpha(.25)
    .alphaTarget(0)

  const svg = d3.select('#fun')

  let randomColor_1 = getRandomColor()
  const link = svg.append("g")
    .attr('stroke', randomColor_1)
    .attr("stroke-linecap", 'round')
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("stroke-width", x => x.thick);

  set_interval = setInterval(_ => {
    forceNode.strength(-Math.sin(floati) * (770 + Math.random() * 7))
    forceCenter.strength(0.05 + 0.008 * Math.random())
    simulation.alpha(0.25)
    floati += 0.15
  }, 200)

  const umm = svg.selectAll('image')
    .data(nodes)
    .join(enter => enter.append("svg:image")
      .attr('xlink:href', x => x.img)
      .attr('height', d => d.height)
      .style('position', 'absolute')
      .style('top', '100%')
      .style('left', '50%')
      .style('transform-box', 'fill-box')
      .style('transform', x => `translate(${x.over}, ${x.up})`)
      , update => update, exit => exit.remove())
    .call(drag(simulation))

  

  
  const linkBACK = svg.append("g")
    .attr('stroke', '#000')
    .attr("stroke-linecap", 'round')
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("stroke-width", x => x.thick)

  function ticked() {
    umm.attr("x", d => d.x)
    umm.attr("y", d => d.y)
      .attr('xlink:href', x => x.img)

    link
      .attr("x1", d => d.source.x + d.xShift)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x + d.xShift)
      .attr("y2", d => d.target.y);

    linkBACK
      .attr("x1", d => d.source.x + d.back_dx + d.xShift)
      .attr("y1", d => d.source.y + d.back_dy)
      .attr("x2", d => d.target.x + d.back_dx + d.xShift)
      .attr("y2", d => d.target.y + d.back_dy)
  }
}



// Main logic of script
if (curr_short === 'index') {
  change_images()
  treeSimulation()
}