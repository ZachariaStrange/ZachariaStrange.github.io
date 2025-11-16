// js/main.js
d3.csv("data/Student_performance_data.csv", d => ({
  Age: +d.Age,
  GPA: +d.GPA,
  StudyTimeWeekly: +d.StudyTimeWeekly,
  ParentalEducation: +d.ParentalEducation,
  ParentalSupport: +d.ParentalSupport
})).then(data => {
  drawStudyTimeVsGPA(data);
  drawAgeVsGPA(data);
  drawParentalInfluence(data);
});


// Visualization 1: Study Time vs GPA (Scatter with trend line)
function drawStudyTimeVsGPA(data) {
  const margin = { top: 20, right: 20, bottom: 50, left: 50 };
  const width = 600 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  const svg = d3.select("#vis-studytime-gpa")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Scales
  const x = d3.scaleLinear()
    .domain(d3.extent(data, d => d.StudyTimeWeekly))
    .nice()
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([0, 4]) // GPA 0–4
    .nice()
    .range([height, 0]);

  // Axes
  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));

  svg.append("g").call(d3.axisLeft(y));

  // Axis labels
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .attr("text-anchor", "middle")
    .text("Study Time Weekly (hours)");

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -35)
    .attr("text-anchor", "middle")
    .text("GPA");

  // Points
  svg.selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("cx", d => x(d.StudyTimeWeekly))
    .attr("cy", d => y(d.GPA))
    .attr("r", 3)
    .attr("fill", "steelblue")
    .attr("opacity", 0.6);

  // --- Simple linear regression for trend line ---
  const xMean = d3.mean(data, d => d.StudyTimeWeekly);
  const yMean = d3.mean(data, d => d.GPA);

  let num = 0, den = 0;
  data.forEach(d => {
    const xDev = d.StudyTimeWeekly - xMean;
    const yDev = d.GPA - yMean;
    num += xDev * yDev;
    den += xDev * xDev;
  });

  const slope = num / den;
  const intercept = yMean - slope * xMean;

  const xVals = d3.extent(data, d => d.StudyTimeWeekly);
  const linePoints = xVals.map(xv => ({
    x: xv,
    y: slope * xv + intercept
  }));

  svg.append("line")
    .attr("x1", x(linePoints[0].x))
    .attr("y1", y(linePoints[0].y))
    .attr("x2", x(linePoints[1].x))
    .attr("y2", y(linePoints[1].y))
    .attr("stroke", "darkred")
    .attr("stroke-width", 2);
}

