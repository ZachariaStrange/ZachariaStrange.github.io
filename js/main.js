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

//  Visualization 2: Age vs GPA (stacked by age, with hover interaction)
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

  // ---- Get unique ages and create GPA bins ----
  const ages = Array.from(new Set(data.map(d => d.Age))).sort(d3.ascending);

  const gpaBin = d3.bin()
    .domain([0, 4.0])
    .value(d => d.GPA)
    .thresholds(40);

  const gpasBinned = gpaBin(data);

  // ---- Build row data: for each GPA bin, count students by age ----
  const rows = gpasBinned.map(bin => {
    const counts = {};
    let total = 0;

    ages.forEach(age => {
      const count = bin.filter(d => d.Age === age).length;
      counts[age] = count;
      total += count;
    });

    return {
      gpa: (bin.x0 + bin.x1) / 2,
      x0: bin.x0,
      x1: bin.x1,
      counts,
      total
    };
  }).filter(r => r.total > 0); // drop empty bins

  if (rows.length === 0) {
    console.warn("No data for Age vs GPA.");
    return;
  }

  // ---- Scales ----

  // x-axis: count of students (length of stacked bar)
  const x = d3.scaleLinear()
    .domain([0, d3.max(rows, d => d.total)])
    .nice()
    .range([0, width]);

  // y-axis: GPA bins (as band scale)
  const y = d3.scaleBand()
    .domain(rows.map(r => r.gpa))
    .range([0, height])
    .padding(0.1);

  // Color by age
  const color = d3.scaleOrdinal()
    .domain(ages)
    .range(["#08306b", "#6baed6", "#ffd92f", "#b30000"]);

  // ---- Axes ----
  const xAxis = d3.axisBottom(x);
  const yAxis = d3.axisLeft(y).tickFormat(d3.format(".3f"));

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

  // ---- Hover text (like "Count per year: X" in example) ----
  const hoverText = svg.append("text")
    .attr("id", "age-gpa-hover")
    .attr("x", width - 10)
    .attr("y", 300)
    .attr("text-anchor", "end")
    .style("font-size", "12px")
    .style("fill", "#333")
    .text("Hover over a bar segment");

  // ---- Draw stacked horizontal bars ----
  const rowGroups = svg.selectAll(".gpa-row")
    .data(rows)
    .enter()
    .append("g")
    .attr("class", "gpa-row")
    .attr("transform", d => `translate(0,${y(d.gpa)})`);

  // For each GPA row, create stacked segments per age
  rowGroups.selectAll("rect")
    .data(d => {
      let acc = 0;
      return ages.map(age => {
        const count = d.counts[age] || 0;
        const start = acc;
        acc += count;

        return {
          age: age,
          x0: start,
          x1: acc,
          count: count,
          gpa: d.gpa,
          total: d.total
        };
      }).filter(seg => seg.count > 0);
    })
    .enter()
    .append("rect")
    .attr("x", d => x(d.x0))
    .attr("y", 0)
    .attr("width", d => x(d.x1) - x(d.x0))
    .attr("height", y.bandwidth())
    .attr("fill", d => color(d.age))
    .attr("opacity", 0.9)

    
    // --- INTERACTIONS: hover like the Betty/Linda example ---
    .on("mouseover", function (event, seg) {
      // fade all segments
      svg.selectAll(".gpa-row rect")
        .attr("opacity", 0.3)
        .attr("stroke", "none");

      // highlight the hovered one
      d3.select(this)
        .attr("opacity", 1.0)
        .attr("stroke", "black")
        .attr("stroke-width", 1.5);

      hoverText.text(
        `GPA ~ ${seg.gpa.toFixed(2)}, Age ${seg.age}: ${seg.count} students (of ${seg.total})`
      );
    })
    .on("mouseout", function () {
      svg.selectAll(".gpa-row rect")
        .attr("opacity", 0.9)
        .attr("stroke", "none");

      hoverText.text("Hover over a bar segment");
    });

  // ---- Legend for ages ----
  const legend = svg.append("g")
    .attr("transform", `translate(${width - 100}, 0)`);

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

  console.log("Age vs GPA drawn (stacked with hover interaction).");
}

// Visualization 3: Effect of Parental Education/Support on GPA (with hover interaction)
function drawParentalInfluence(data) {
  console.log("Drawing Effect of Parental Education/Support on GPA");

  const margin = { top: 20, right: 60, bottom: 50, left: 60 };
  const width = 600 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  const svg = d3.select("#vis-parental-gpa")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // ---------------------------------
  // GPA binning
  // ---------------------------------
  const binGen = d3.bin()
    .domain([0, 4.0])
    .value(d => d.GPA)
    .thresholds(d3.range(0, 4.0000, 0.1));

  const bins = binGen(data);

  const rows = bins.map(bin => {
    const eduSum = d3.sum(bin, d => d.ParentalEducation) || 0;
    const supSum = d3.sum(bin, d => d.ParentalSupport) || 0;
    const x0 = bin.x0 ?? 0;
    const x1 = bin.x1 ?? 0;
    const center = (x0 + x1) / 2;

    return {
      x0,
      x1,
      center,
      eduSum,
      supSum
    };
  });

  // ---------------------------------
  // Scales
  // ---------------------------------
  const x = d3.scaleLinear()
    .domain([0, 4.5])
    .range([0, width]);

  // Width of one GPA bin (all bins equal width)
  const binWidth = x(rows[0].x1) - x(rows[0].x0);
  const supBarWidth = binWidth * 0.9;
  const eduBarWidth = binWidth * 0.4;

  // Left Y: Parental Education 0–160
  const yLeft = d3.scaleLinear()
    .domain([0, 160])
    .range([height, 0]);

  // Right Y: Parental Support 0–200
  const yRight = d3.scaleLinear()
    .domain([0, 200])
    .range([height, 0]);

  // ---------------------------------
  // Axes
  // ---------------------------------
  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(
      d3.axisBottom(x)
        .tickValues(d3.range(0, 4.5, 0.5))
        .tickFormat(d3.format(".1f"))
    );

  svg.append("g")
    .call(
      d3.axisLeft(yLeft)
        .tickValues([0, 20, 40, 60, 80, 100, 120, 140, 160])
    );

  svg.append("g")
    .attr("transform", `translate(${width},0)`)
    .call(
      d3.axisRight(yRight)
        .tickValues([0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200])
    );

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
    .text("Parental Education");

  svg.append("text")
    .attr("transform", "rotate(90)")
    .attr("x", height / 2)
    .attr("y", -width - 45)
    .attr("text-anchor", "middle")
    .text("Parental Support");

  // ---------------------------------
  // Hover text (similar idea to "Count per year")
  // ---------------------------------
  const hoverText = svg.append("text")
    .attr("id", "parental-hover-text")
    .attr("x", width - 10)
    .attr("y", 0)
    .attr("text-anchor", "end")
    .style("font-size", "12px")
    .style("fill", "#333")
    .text("Hover over a bar");

  // ---------------------------------
  // Bars
  // ---------------------------------

  // Blue bars: Parental Education
  svg.selectAll(".bar-education")
    .data(rows)
    .enter()
    .append("rect")
    .attr("class", "bar-education")
    .attr("x", d => x(d.center) - eduBarWidth)
    .attr("y", d => yLeft(Math.min(d.eduSum, 160)))
    .attr("width", eduBarWidth * 2)
    .attr("height", d => height - yLeft(Math.min(d.eduSum, 160)))
    .attr("fill", "#1f77b4")
    .attr("opacity", 0.9)
    .on("mouseover", function (event, d) {
      svg.selectAll(".bar-education, .bar-support")
        .attr("opacity", 0.3)
        .attr("stroke", "none");

      d3.select(this)
        .attr("opacity", 1.0)
        .attr("stroke", "black")
        .attr("stroke-width", 1.5);

      hoverText.text(
        `GPA ~ ${d.center.toFixed(2)} | Education: ${d.eduSum.toFixed(1)}, Support: ${d.supSum.toFixed(1)}`
      );
    })
    .on("mouseout", function () {
      svg.selectAll(".bar-education, .bar-support")
        .attr("opacity", 0.9)
        .attr("stroke", "none");

      hoverText.text("Hover over a bar");
    });

  // Orange bars: Parental Support
  svg.selectAll(".bar-support")
    .data(rows)
    .enter()
    .append("rect")
    .attr("class", "bar-support")
    .attr("x", d => x(d.center) - supBarWidth / 2)
    .attr("y", d => yRight(Math.min(d.supSum, 200)))
    .attr("width", supBarWidth)
    .attr("height", d => height - yRight(Math.min(d.supSum, 200)))
    .attr("fill", "#ff7f00")
    .attr("opacity", 0.9)
    .on("mouseover", function (event, d) {
      svg.selectAll(".bar-education, .bar-support")
        .attr("opacity", 0.3)
        .attr("stroke", "none");

      d3.select(this)
        .attr("opacity", 1.0)
        .attr("stroke", "black")
        .attr("stroke-width", 1.5);

      hoverText.text(
        `GPA ~ ${d.center.toFixed(2)} | Support: ${d.supSum.toFixed(1)}, Education: ${d.eduSum.toFixed(1)}`
      );
    })
    .on("mouseout", function () {
      svg.selectAll(".bar-education, .bar-support")
        .attr("opacity", 0.9)
        .attr("stroke", "none");

      hoverText.text("Hover over a bar");
    });

  // ---------------------------------
  // Legend (right side)
  // ---------------------------------
  const legend = svg.append("g")
    .attr("transform", `translate(${width - 160}, 10)`);

  const items = [
    { label: "Parental Education", color: "#1f77b4" },
    { label: "Parental Support",   color: "#ff7f00" }
  ];

  items.forEach((item, i) => {
    const g = legend.append("g")
      .attr("transform", `translate(0,${i * 20})`);

    g.append("rect")
      .attr("width", 14)
      .attr("height", 14)
      .attr("fill", item.color);

    g.append("text")
      .attr("x", 20)
      .attr("y", 11)
      .text(item.label);
  });

  console.log("Effect of Parental Education/Support on GPA drawn (with hover interaction).");
}
