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
  const margin = { top: 20, right: 20, bottom: 50, left: 60 };
  const width = 600 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  const svg = d3.select("#vis-studytime-gpa")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // -------------------------
  // SCALES
  // -------------------------

  // X = GPA
  const x = d3.scaleLinear()
    .domain([-0.2, 4.2])
    .range([0, width]);

  // Y = Study Time Weekly
  const y = d3.scaleLinear()
    .domain([0, 20])
    .nice()
    .range([height, 0]);

  // -------------------------
  // AXES
  // -------------------------
  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));

  svg.append("g")
    .call(d3.axisLeft(y));

  // Axis labels
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .attr("text-anchor", "middle")
    .text("GPA");

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -45)
    .attr("text-anchor", "middle")
    .text("Study Time Weekly (hours)");

  // -------------------------
  // POINTS
  // -------------------------
  svg.selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("cx", d => x(d.GPA))
    .attr("cy", d => y(d.StudyTimeWeekly))
    .attr("r", 3)
    .attr("fill", "steelblue")
    .attr("opacity", 0.6);

  // -------------------------
  // TREND LINE
  // -------------------------

  const xMean = d3.mean(data, d => d.GPA);
  const yMean = d3.mean(data, d => d.StudyTimeWeekly);

  let num = 0, den = 0;
  data.forEach(d => {
    const xDev = d.GPA - xMean;
    const yDev = d.StudyTimeWeekly - yMean;
    num += xDev * yDev;
    den += xDev * xDev;
  });

  const slope = num / den;
  const intercept = yMean - slope * xMean;

  const xVals = [-0.2, 4.2];
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
  console.log("Drawing Age vs GPA (stacked by age)");

  const margin = { top: 20, right: 20, bottom: 50, left: 80 };
  const width = 600 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  const svg = d3.select("#vis-age-gpa")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // ---- 1. Get unique ages and GPAs ----
  const ages = Array.from(new Set(data.map(d => d.Age))).sort(d3.ascending); // e.g. [15,16,17,18]
  //const gpas = Array.from(new Set(data.map(d => d.GPA))).sort(d3.ascending); // numeric, 0.000 ... 3.920
  const gpaBin = d3.bin()
                  .domain([0, 4.0])
                  .value(d => d.GPA)
                  .thresholds(40)

  const gpasBinned = gpaBin(data); 

  // ---- 2. Build row data: for each GPA, count students by age ----
  const rows = gpasBinned.map(bin => {
    const counts = {};
    let total = 0;

    ages.forEach(age => {
      const count = bin.filter(d => d.Age === age).length;
      counts[age] = count;
      total += count;
    });

    return {
      gpa: (bin.x0 + bin.x1) / 2, // This is the midpoint of the GPA bins
      x0: bin.x0,
      x1: bin.x1,
      counts,
      total
    };
  }).filter(r => r.total > 0); // drop GPA values with no students

  if (rows.length === 0) {
    console.warn("No data for Age vs GPA.");
    return;
  }

  // ---- 3. Scales ----

  // x-axis: count of students (length of stacked bar)
  const x = d3.scaleLinear()
    .domain([0, d3.max(rows, d => d.total)]) // max total count across GPAs
    .nice()
    .range([0, width]);

  // y-axis: GPA bins, 0 at top, highest at bottom (band scale)
  const y = d3.scaleBand()
    .domain(rows.map(r => r.gpa)) // numeric GPAs
    .range([0, height])           // 0 at top, height at bottom
    .padding(0.1);

  // Color by age: dark blue, light blue, yellow, dark red
  const color = d3.scaleOrdinal()
    .domain(ages)
    .range(["#08306b", "#6baed6", "#ffd92f", "#b30000"]);

  // ---- 4. Axes ----
  const xAxis = d3.axisBottom(x);
  const yAxis = d3.axisLeft(y).tickFormat(d3.format(".3f")); // show 0.000, 0.140, ... etc.

  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(xAxis);

  svg.append("g")
    .call(yAxis);

  // Axis labels
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .attr("text-anchor", "middle")
    .text("Count of Students (by age)");

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -60)
    .attr("text-anchor", "middle")
    .text("GPA");

  // ---- 5. Draw stacked horizontal bars ----

  const rowGroups = svg.selectAll(".gpa-row")
    .data(rows)
    .enter()
    .append("g")
    .attr("class", "gpa-row")
    .attr("transform", d => `translate(0,${y(d.gpa)})`);

  rowGroups.selectAll("rect")
    .data(d => {
      let acc = 0;
      // Build segments in a fixed age order
      return ages.map(age => {
        const count = d.counts[age] || 0;
        const start = acc;
        acc += count;
        return {
          age: age,
          x0: start,
          x1: acc
        };
      }).filter(seg => seg.x1 > seg.x0); // ignore zero-length segments
    })
    .enter()
    .append("rect")
    .attr("x", d => x(d.x0))
    .attr("y", 0)
    .attr("width", d => x(d.x1) - x(d.x0))
    .attr("height", y.bandwidth())
    .attr("fill", d => color(d.age));

  // ---- 6. Legend for ages ----
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

  console.log("Age vs GPA drawn (stacked).");
}











