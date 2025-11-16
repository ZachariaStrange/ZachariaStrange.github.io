// js/main.js
d3.csv("Student_performance_data.csv", d => ({
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

//  Visualization 2: Age vs GPA (Grouped bars by GPA bins)
function drawAgeVsGPA(data) {
  const margin = { top: 20, right: 20, bottom: 50, left: 50 };
  const width = 600 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  const svg = d3.select("#vis-age-gpa")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const bins = [
    { name: "0–1", min: 0, max: 1 },
    { name: "1–2", min: 1, max: 2 },
    { name: "2–3", min: 2, max: 3 },
    { name: "3–4", min: 3, max: 4.0001 }
  ];

  const ages = Array.from(new Set(data.map(d => d.Age))).sort(d3.ascending);

  // Prepare counts per (bin, age)
  const counts = [];
  bins.forEach(bin => {
    ages.forEach(age => {
      const count = data.filter(d =>
        d.Age === age &&
        d.GPA >= bin.min &&
        d.GPA < bin.max
      ).length;
      counts.push({
        bin: bin.name,
        age: age,
        count: count
      });
    });
  });

  const x0 = d3.scaleBand()
    .domain(bins.map(b => b.name))
    .range([0, width])
    .paddingInner(0.1);

  const x1 = d3.scaleBand()
    .domain(ages)
    .range([0, x0.bandwidth()])
    .padding(0.05);

  const y = d3.scaleLinear()
    .domain([0, d3.max(counts, d => d.count)])
    .nice()
    .range([height, 0]);

  const color = d3.scaleOrdinal()
    .domain(ages)
    .range(d3.schemeTableau10);

  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x0));

  svg.append("g").call(d3.axisLeft(y));

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .attr("text-anchor", "middle")
    .text("GPA Range");

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -35)
    .attr("text-anchor", "middle")
    .text("Number of Students");

  const groups = svg.selectAll(".bin-group")
    .data(bins.map(b => b.name))
    .enter()
    .append("g")
    .attr("class", "bin-group")
    .attr("transform", d => `translate(${x0(d)},0)`);

  groups.selectAll("rect")
    .data(binName => counts.filter(c => c.bin === binName))
    .enter()
    .append("rect")
    .attr("x", d => x1(d.age))
    .attr("y", d => y(d.count))
    .attr("width", x1.bandwidth())
    .attr("height", d => height - y(d.count))
    .attr("fill", d => color(d.age));

  // Simple legend
  const legend = svg.append("g")
    .attr("transform", "translate(0,0)");

  ages.forEach((age, i) => {
    const g = legend.append("g")
      .attr("transform", `translate(0,${i * 18})`);
    g.append("rect")
      .attr("x", width - 120)
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", color(age));
    g.append("text")
      .attr("x", width - 100)
      .attr("y", 10)
      .text(`Age ${age}`);
  });
}
