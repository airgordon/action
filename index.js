const width = 1000;
const height = 980;

const lineHeight = 3;

const dotHeight = 9;
const vdotHeight = 7;

const dotWidth = 9;
const vdotWidth = 7;

const m = 1;
const k1 = 2;
const k2 = 2;

const K = (vx, vy) => m * vx * vx / 2 + m * vy * vy / 2;
const U = (x, y) => k1 * x * x / 2 + k2 * y * y / 2;
const L = (x, v) => K(v) - U(x);

const dotsN = 6;
const Lines = dotsN - 1;

const verletDots = 6;

//  const dt = 1 / Lines;
const dt = 0.5;
const vdt = dt;


// Make the DIV element draggable:
const main = document.getElementById("main");
const counter = document.getElementById("action-txt");
const counterBar = document.getElementById("action-bar");
const gradDecBtn = document.getElementById("gradDec");


const actionCurve = createCurve(main, dotsN, 'dot', 'line');
addGradVectors(actionCurve);
updateLines(actionCurve);
updateAction(actionCurve);

const verletCurve = createCurve(main, verletDots, 'vdot', 'line');

makeElementDraggable(verletCurve.dots[0], () => {
  updateVerlet();
  updateLines(verletCurve);
});
makeElementDraggable(verletCurve.dots[1], () => {
  updateVerlet();
  updateLines(verletCurve);
});

{
  const dot1 = actionCurve.dots[0];
  const dot2 = actionCurve.dots[0 + 1];
  const dot1cent = center(dot1);
  const dot2cent = center(dot2);

  {
    const vdot = verletCurve.dots[0];
    vdot.style.left = 500 - vdotWidth / 2 + "px";
    vdot.style.top = 600 - vdotHeight / 2 + "px";
  } {
    const vdot = verletCurve.dots[1];
    vdot.style.left = 550 - vdotWidth / 2 + "px";
    vdot.style.top = 670 - vdotHeight / 2 + "px";
  }
}

updateVerlet();
updateLines(verletCurve);

let gradDecTaskId = null;

gradDecBtn.addEventListener("click", () => {
  console.log("gradDecBtn clicked");
  if (gradDecTaskId) {
    clearInterval(gradDecTaskId);
    gradDecTaskId = null;
    gradDecBtn.setAttribute("value", "Start gradient descent");
    return;
  } else {
    const oneStep = () => {
      const vel = 0.01;
      for (let piIdx = 1; piIdx < actionCurve.dots.length - 1; piIdx++) {
        const dot1 = actionCurve.dots[piIdx];
        const dot1cent = center(dot1);
        const r = scale(dot1cent);
        const mGrad = actionCurve.grads[piIdx];
        const movedR = { xx: r.xx + mGrad.x * vel, yy: r.yy + mGrad.y * vel };
        const movedP = unscale(movedR.xx, movedR.yy);
        dot1.style.left = movedP.xx - dotWidth / 2 + "px";
        dot1.style.top = movedP.yy - dotHeight / 2 + "px";
        updateLines(actionCurve);
        updateAction(actionCurve);
      }
    };
    gradDecTaskId = setInterval(oneStep, 100);
    gradDecBtn.setAttribute("value", "Stop gradient descent");
  }

});


/** ----------------------------**/
/**         END OF SCRIPT       **/
/**---------------------------- **/

function createCurve(root, N, dotClass, lineClass) {
  const dots = []; ///= main.getElementsByClassName("dot");

  for (let i = 0; i < N; i++) {
    const dot = document.createElement("div");
    dot.classList.add(dotClass);
    root.appendChild(dot);
    dots.push(dot);
  }
  dots[0].classList.add("first");
  dots[1].classList.add("second");
  dots[N - 1].classList.add("last");

  const lines = [];
  for (let i = 0; i < N - 1; i++) {
    const line = document.createElement("div");
    line.classList.add(lineClass);
    root.appendChild(line);
    lines.push(line);
  }

  return {
    dots,
    lines
  };
}

function addGradVectors(curve) {
  let idx = 0;
  curve.gradLines = []
  for (const dot of curve.dots) {
    makeElementDraggable(dot, () => {
      updateLines(curve);
      updateAction(curve);
    });

    let x = getRandomInt(1000);
    let y = getRandomInt(900);
    dot.style.left = x + "px";
    dot.style.top = y + "px";
    if (idx != 0 && idx != dotsN - 1) {
      const line = document.createElement("div");
      line.classList.add('gradLine');
      main.appendChild(line);
      curve.gradLines.push(line);
    } else {
      curve.gradLines.push(null);
    }
    idx++;
  }
}


const actionAt = (rvC, log) => {
  const dotL = actionCurve.dots[idx - 1];
  const dotR = actionCurve.dots[idx + 1];

  const dotLcent = center(dotL);
  const dotRcent = center(dotR);

  const rvL = scale(dotLcent);
  const rvR = scale(dotRcent);

  const vxL = (rvC.xx - rvL.xx) / dt;
  const vyL = (rvC.yy - rvL.yy) / dt;
  const vxR = (rvR.xx - rvC.xx) / dt;
  const vyR = (rvR.yy - rvC.yy) / dt;

  const IK_ = (K(vxL, vyL) + K(vxR, vyR)) / 2 * dt;
  log.push({
    v: K(vxL, vyL) / 2 * dt,
    d: "K" + (idx - 1) + idx + "/2"
  });
  log.push({
    v: K(vxR, vyR) / 2 * dt,
    d: "K" + idx + (idx + 1) + "/2"
  });

  const IU_ = U(rvC.xx, rvC.yy) * dt;
  log.push({
    v: -U(rvC.xx, rvC.yy) * dt,
    d: "U" + idx
  });

  console.log(idx + " a IU=" + IU_ + " K1=" + K(vxL, vyL) / 2 * dt + " K2 = " + K(vxR, vyR) / 2 * dt);
  const dS2 = IK_ - IU_;

  // console.log("sdfgdf " + (log.reduce((partialSum, a) => partialSum + a, 0) - dS2));

  return dS2;
}

function calcAction(rvs) {
  let S = 0;
  const p = [];
  for (let idx = 0; idx < rvs.length - 1; idx++) {

    const rv1 = rvs[idx];
    const rv2 = rvs[idx + 1];
    const t1 = dt * idx;
    const t2 = dt * (idx + 1);
    const t_to_x = t => (t - t1) / (t2 - t1) * (rv2.xx - rv1.xx) + rv1.xx;
    const t_to_y = t => (t - t1) / (t2 - t1) * (rv2.yy - rv1.yy) + rv1.yy;
    const vx = (rv2.xx - rv1.xx) / dt;
    const vy = (rv2.yy - rv1.yy) / dt;
    const Ut = t => U(t_to_x(t), t_to_y(t));

    const IK = K(vx, vy) * dt;
    // SS.push({ v: IK, d: "K" + idx + (idx + 1) });

    const IU = (Ut(t1) + Ut(t2)) / 2 * dt;
    // SS.push({ v: -Ut(t1) * dt / 2, d: "U" + idx + "/2" });
    // SS.push({ v: -Ut(t2) * dt / 2, d: "U" + (idx + 1) + "/2" });

    const dS = IK - IU;
    p.push(dS);

    // console.log(idx + " IU1=" + Ut(t1) / 2 * dt + " IU2=" + Ut(t2) / 2 * dt);
    // console.log(idx + " IK=" + IK + " IU=" + IU + " dS=" + dS);

    S = S + dS;
  }
  return {
    S,
    p
  };
}

function calcGrads(scaledPoints) {
  const grads = [];
  grads.push(null);

  for (let piIdx = 1; piIdx < scaledPoints.length - 1; piIdx++) {

    const h = 0.01;

    const mL = [...scaledPoints];
    mL[piIdx] = {
      xx: mL[piIdx].xx - h,
      yy: mL[piIdx].yy
    };

    const mR = [...scaledPoints];
    mR[piIdx] = {
      xx: mR[piIdx].xx + h,
      yy: mR[piIdx].yy
    };

    const mB = [...scaledPoints];
    mB[piIdx] = {
      xx: mB[piIdx].xx,
      yy: mB[piIdx].yy - h
    };

    const mT = [...scaledPoints];
    mT[piIdx] = {
      xx: mT[piIdx].xx,
      yy: mT[piIdx].yy + h
    };

    const dx = (calcAction(mR).S - calcAction(mL).S) / (2 * h);
    const dy = (calcAction(mT).S - calcAction(mB).S) / (2 * h);
    const mGrad = {
      x: -dx,
      y: -dy
    };
    grads.push(mGrad);
  }
  grads.push(null);
  return grads;
}

function updateAction(curve) {

  scaledPoints = curve.dots.map(center).map(scale);
  curve.grads = calcGrads(scaledPoints);
  const { S, p } = calcAction(scaledPoints);

  for (let piIdx = 1; piIdx < curve.dots.length - 1; piIdx++) {
    const dot1 = curve.dots[piIdx];
    const dot1cent = center(dot1);
    const mGrad = curve.grads[piIdx];

    const deg = -pointsToAng({
      x: 0,
      y: 0
    }, mGrad); // TODO check sign

    console.log(piIdx, " ", mGrad.x > 0 ? "R" : "L", mGrad.y > 0 ? "U" : "D", deg);


    const grLine = curve.gradLines[piIdx];
    grLine.style.top = dot1cent.y - lineHeight / 2 + "px";
    grLine.style.left = dot1cent.x + "px";

    grLine.style.webkitTransform = 'rotate(' + deg + 'deg)';
    grLine.style.mozTransform = 'rotate(' + deg + 'deg)';
    grLine.style.msTransform = 'rotate(' + deg + 'deg)';
    grLine.style.oTransform = 'rotate(' + deg + 'deg)';
    grLine.style.transform = 'rotate(' + deg + 'deg)';
  }

  let idx = 0;
  for (const line of curve.lines) {

    const pen = p[idx] * 100;

    line.style["background-color"] = "rgb(" + pen + ", " + pen + ", " + pen + ")";

    idx++;
  }

  counter.innerText = "__S=" + S;

  counterBar.style.width = (S * 200 + 400) + "px";
}


function updateLines(curve) {
  let idx = 0;
  let S = 0;
  for (const line of curve.lines) {
    const dot1 = curve.dots[idx];
    const dot2 = curve.dots[idx + 1];
    const dot1cent = center(dot1);
    const dot2cent = center(dot2);

    const deg = pointsToAng(dot1cent, dot2cent);

    line.style.webkitTransform = 'rotate(' + deg + 'deg)';
    line.style.mozTransform = 'rotate(' + deg + 'deg)';
    line.style.msTransform = 'rotate(' + deg + 'deg)';
    line.style.oTransform = 'rotate(' + deg + 'deg)';
    line.style.transform = 'rotate(' + deg + 'deg)';

    const dst = dist(dot1cent, dot2cent);
    line.style.width = dst + "px";

    // const lineCnt = center(dot1cent, dot2cent);
    line.style.top = dot1cent.y - lineHeight / 2 + "px";
    line.style.left = dot1cent.x + "px";

    idx++;
  }

}


function updateVerlet() {

  const dot1cent = center(verletCurve.dots[0]);
  const dot2cent = center(verletCurve.dots[1]);

  const rv1 = scale(dot1cent);
  const rv2 = scale(dot2cent);

  let xp = rv1.xx;
  let yp = rv1.yy;
  let xn = rv2.xx;
  let yn = rv2.yy;

  const vdots = main.getElementsByClassName('vdot');
  const vdotsN = vdots.length;
  for (let i = 2; i < vdotsN; i++) {
    const ddt = vdt;
    const xf = 2 * xn - xp - ddt * ddt * diff(U, xn, yn, 'x');
    const yf = 2 * yn - yp - ddt * ddt * diff(U, xn, yn, 'y');
    const vdot = vdots[i];

    const {
      xx,
      yy
    } = unscale(xf, yf);

    vdot.style.left = xx - vdotWidth / 2 + "px";
    vdot.style.top = yy - vdotHeight / 2 + "px";



    xp = xn;
    yp = yn;
    xn = xf;
    yn = yf;

  }
}

function makeElementDraggable(elmnt, onElementDrag) {
  elmnt.classList.add("movable")

  console.log("dragElement");
  let pos1 = 0,
    pos2 = 0,
    pos3 = 0,
    pos4 = 0;
  elmnt.onmousedown = dragMouseDown;

  function dragMouseDown(e) {
    console.log("dragMouseDown");
    e = e || window.event;
    e.preventDefault();
    // get the mouse cursor position at startup:
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    console.log("elementDrag");
    e = e || window.event;
    e.preventDefault();
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // set the element's new position:
    elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
    elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";

    onElementDrag();
  }

  function closeDragElement() {
    console.log("closeDragElement");
    // stop moving when mouse button is released:
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

function center(element) {
  const rect = element.getBoundingClientRect();
  return {
    x: (rect.left + rect.right) / 2 + document.documentElement.scrollLeft,
    y: (rect.top + rect.bottom) / 2 + document.documentElement.scrollTop
  }
}

function centerOfPoints(a, b) {
  return {
    x: Math.ceil((a.x + b.x) / 2),
    y: Math.ceil((a.y + b.y) / 2)
  }
}

function pointsToAng(dot1cent, dot2cent) {
  const dx = dot2cent.x - dot1cent.x;
  const dy = dot2cent.y - dot1cent.y;

  // return 180 / 3.1415 * Math.atan( dy / dx );
  if (dx >= 0) {
    return 180 / 3.1415 * Math.atan(dy / dx);
  } else {
    return 180 / 3.1415 * (3.1415 + Math.atan(dy / dx));
  }
}

function dist(a, b) {
  return Math.round(Math.hypot(a.x - b.x, a.y - b.y));
}

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

function scale(p) {
  return {
    xx: (2 * p.x - width) / width,
    yy: (height - 2 * p.y) / height
  };
}

function unscale(x, y) {
  return {
    xx: width * (1 + x) / 2,
    yy: height * (1 - y) / 2
  };
}

function diff(f, x, y, variable) {
  if (variable === 'x') {
    const dx = 0.00001;
    return (f(x + dx, y) - f(x - dx, y)) / (2 * dx);
  } else if (variable === 'y') {
    const dy = 0.00001;
    return (f(x, y + dy) - f(x, y - dy)) / (2 * dy);
  } else {
    throw Exception();
  }
}
