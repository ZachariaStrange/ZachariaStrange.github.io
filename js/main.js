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
  console.log("Drawing Age vs GPA");

  const margin = { top: 20, right: 20, bottom: 50, left: 80 };
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

  const totals = bins.map(bin => {
    const ageCounts = {};
    ages.forEach(age => {
      ageCounts[age] = data.filter(d =>
        d.Age === age &&
        d.GPA >= bin.min &&
        d.GPA < bin.max
      ).length;
    });

    const total = ages.reduce((sum, age) => sum + ageCounts[age], 0);

    return {
      bin: bin.name,
      ageCounts: ageCounts,
      total: total
    };
  });

  const x = d3.scaleLinear()
    .domain([0, d3.max(totals, d => d.total) || 1])
    .nice()
    .range([0, width]);

  const y = d3.scaleBand()
    .domain(bins.map(b => b.name))
    .range([0, height])
    .padding(0.2);

  const color = d3.scaleOrdinal()
    .domain(ages)
    .range(["#c6dbef", "#6baed6", "#3182bd", "#08519c"]);

  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));

  svg.append("g")
    .call(d3.axisLeft(y));

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .attr("text-anchor", "middle")
    .text("Number of Students");

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -60)
    .attr("text-anchor", "middle")
    .text("GPA Range");

  const groups = svg.selectAll(".bin-group")
    .data(totals)
    .enter()
    .append("g")
    .attr("class", "bin-group")
    .attr("transform", d => `translate(0,${y(d.bin)})`);

  groups.selectAll("rect")
    .data(d => {
      let acc = 0;
      return ages.map(age => {
        const count = d.ageCounts[age] || 0;
        const start = acc;
        acc += count;
        return {
          age: age,
          x0: start,
          x1: acc
        };
      }).filter(seg => seg.x1 > seg.x0);
    })
    .enter()
    .append("rect")
    .attr("x", d => x(d.x0))
    .attr("y", 0)
    .attr("width", d => x(d.x1) - x(d.x0))
    .attr("height", y.bandwidth())
    .attr("fill", d => color(d.age));

  const legend = svg.append("g")
    .attr("transform", `translate(${width - 150}, 0)`);

  ages.forEach((age, i) => {
    const g = legend.append("g")
      .attr("transform", `translate(0,${i * 18})`);

    g.append("rect")
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", color(age));

    g.append("text")
      .attr("x", 18)
      .attr("y", 10)
      .text(`Age ${age}`);
  });

  console.log("Age vs GPA drawn.");
}


function drawParentalInfluence(data) {
  const margin = { top: 20, right: 20, bottom: 50, left: 50 };
  const width = 600 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  const svg = d3.select("#vis-parental-gpa")
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

  const stats = bins.map(bin => {
    const subset = data.filter(d => d.GPA >= bin.min && d.GPA < bin.max);
    return {
      bin: bin.name,
      meanEd: d3.mean(subset, d => d.ParentalEducation) || 0,
      meanSup: d3.mean(subset, d => d.ParentalSupport) || 0
    };
  });

  const x = d3.scalePoint()
    .domain(bins.map(b => b.name))
    .range([0, width])
    .padding(0.5);

  const y = d3.scaleLinear()
    .domain([0, d3.max(stats, d => Math.max(d.meanEd, d.meanSup))])
    .nice()
    .range([height, 0]);

  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));

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
    .text("Average Parental Influence");

  const line = d3.line()
    .x(d => x(d.bin))
    .y(d => y(d.value));

  const edData = stats.map(d => ({ bin: d.bin, value: d.meanEd }));
  const supData = stats.map(d => ({ bin: d.bin, value: d.meanSup }));

  svg.append("path")
    .datum(edData)
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 2)
    .attr("d", line);

  svg.append("path")
    .datum(supData)
    .attr("fill", "none")
    .attr("stroke", "orange")
    .attr("stroke-width", 2)
    .attr("d", line);

  const legend = svg.append("g")
    .attr("transform", `translate(${width - 150}, 0)`);

  const items = [
    { label: "Parental Education", color: "steelblue" },
    { label: "Parental Support", color: "orange" }
  ];

  items.forEach((item, i) => {
    const g = legend.append("g")
      .attr("transform", `translate(0,${i * 18})`);
    g.append("rect")
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", item.color);
    g.append("text")
      .attr("x", 18)
      .attr("y", 10)
      .text(item.label);
  });
}

