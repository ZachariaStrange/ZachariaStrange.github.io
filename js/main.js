let originalData = null;
let selectedAge = null;
let selectedGender = null;
let selectedExtracurricular = null;
let selectedTutoring = null;

// Globals for smooth animation of StudyTime vs GPA
let studySvg = null;
let studyGroup = null;
let studyXScale = null;
let studyYScale = null;
let studyTrendLine = null;
let studyInitialized = false;

// NEW: keep age order & colors stable
let allAges = null;
let ageColorScale = null;


function getCurrentFilteredData() {
  if (!originalData) return [];

  return originalData.filter(d =>
    (selectedAge === null || d.Age === selectedAge) &&
    (selectedGender === null || d.Gender === selectedGender) &&
    (selectedTutoring === null || d.Tutoring === selectedTutoring) &&
    (selectedExtracurricular === null || d.Extracurricular === selectedExtracurricular)
  );
}

d3.csv("Student_performance_data.csv", d => ({
  Age: +d.Age,
  GPA: +d.GPA,
  Gender: +d.Gender,
  Tutoring: +d.Tutoring,
  Extracurricular: +d.Extracurricular,
  StudyTimeWeekly: +d.StudyTimeWeekly,
  ParentalEducation: +d.ParentalEducation,
  ParentalSupport: +d.ParentalSupport
})).then(data => {
  originalData = data;

 // NEW: global age list + fixed color mapping
  allAges = Array.from(new Set(originalData.map(d => d.Age))).sort(d3.ascending);
  ageColorScale = d3.scaleOrdinal()
    .domain(allAges)
    .range(["#08306b", "#6baed6", "#ffd92f", "#b30000"]);


   // Initial draw with "no filters" (all selected* are null)
  updateAllVisualizations(getCurrentFilteredData());

  // --- GENDER filter ---
  d3.select("#genderFilter").on("change", function() {
    if (this.value === "") {
      selectedGender = null;
    } else {
      selectedGender = +this.value; // 0 or 1
    }
    updateAllVisualizations(getCurrentFilteredData());
  });

  // --- TUTORING filter ---
  d3.select("#tutorFilter").on("change", function() {
    if (this.value === "") {
      selectedTutoring = null;
    } else {
      selectedTutoring = +this.value; // 0 or 1
    }
    updateAllVisualizations(getCurrentFilteredData());
  });

  // --- EXTRACURRICULAR filter ---
  d3.select("#extracurricularFilter").on("change", function() {
    if (this.value === "") {
      selectedExtracurricular = null;
    } else {
      selectedExtracurricular = +this.value; // 0 or 1
    }
    updateAllVisualizations(getCurrentFilteredData());
  });
});




















function updateAllVisualizations(filteredData) {

  // First chart: smooth animation (reuse SVG + points)
  drawStudyTimeVsGPA(filteredData);

  // Other charts: clear & redraw like before
  d3.select("#vis-age-gpa").selectAll("*").remove();
  d3.select("#vis-parental-gpa").selectAll("*").remove();

  drawAgeVsGPA(filteredData);
  drawParentalInfluence(filteredData);
 
}
  














// Visualization 1: Study Time vs GPA (Scatter with trend line)
function drawStudyTimeVsGPA(data) {
  const margin = { top: 20, right: 20, bottom: 50, left: 60 };
  const width = 600 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  // ----- SETUP / REUSE SVG + GROUP -----
  let svgRoot = d3.select("#vis-studytime-gpa").select("svg");
  let svg;

  if (svgRoot.empty()) {
    // First time: create SVG + inner group
    svgRoot = d3.select("#vis-studytime-gpa")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);

    svg = svgRoot.append("g")
      .attr("class", "chart-root")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Axis groups (created once)
    svg.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${height})`);

    svg.append("g")
      .attr("class", "y-axis");

    // Axis labels (created once)
    svg.append("text")
      .attr("class", "x-label")
      .attr("x", width / 2)
      .attr("y", height + 40)
      .attr("text-anchor", "middle")
      .text("GPA");

    svg.append("text")
      .attr("class", "y-label")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -45)
      .attr("text-anchor", "middle")
      .text("Study Time Weekly (hours)");
  } else {
    svg = svgRoot.select("g.chart-root");
  }

  // ----- SCALES -----
  const x = d3.scaleLinear()
    .domain([-0.2, 4.2])
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([0, 20])
    .nice()
    .range([height, 0]);

  // ----- TRANSITION -----
  const t = d3.transition().duration(800);

  // ----- AXES (smooth transition) -----
  svg.select(".x-axis")
    .transition(t)
    .call(d3.axisBottom(x));

  svg.select(".y-axis")
    .transition(t)
    .call(d3.axisLeft(y));

  // ----- POINTS (data join + transitions) -----
  const circles = svg.selectAll("circle")
    .data(data, (d, i) => i);  // index key is fine here

  // Exit: shrink then remove
  circles.exit()
    .transition(t)
    .attr("r", 0)
    .remove();

  // Update existing
  circles
    .transition(t)
    .attr("cx", d => x(d.GPA))
    .attr("cy", d => y(d.StudyTimeWeekly));

  // Enter: grow from r=0
  circles.enter()
    .append("circle")
    .attr("cx", d => x(d.GPA))
    .attr("cy", d => y(d.StudyTimeWeekly))
    .attr("r", 0)
    .attr("fill", "steelblue")
    .attr("opacity", 0.6)
    .transition(t)
    .attr("r", 3);

  // ----- TREND LINE (smoothly move endpoints) -----
  if (data.length > 1) {
    const xMean = d3.mean(data, d => d.GPA);
    const yMean = d3.mean(data, d => d.StudyTimeWeekly);

    let num = 0, den = 0;
    data.forEach(d => {
      const xDev = d.GPA - xMean;
      const yDev = d.StudyTimeWeekly - yMean;
      num += xDev * yDev;
      den += xDev * xDev;
    });

    const slope = den === 0 ? 0 : num / den;
    const intercept = yMean - slope * xMean;

    const xVals = [-0.2, 4.2];
    const linePoints = xVals.map(xv => ({
      x: xv,
      y: slope * xv + intercept
    }));

    let line = svg.select("line.trend-line");
    if (line.empty()) {
      line = svg.append("line")
        .attr("class", "trend-line")
        .attr("stroke", "darkred")
        .attr("stroke-width", 2);
    }

    line.transition(t)
      .attr("x1", x(linePoints[0].x))
      .attr("y1", y(linePoints[0].y))
      .attr("x2", x(linePoints[1].x))
      .attr("y2", y(linePoints[1].y))
      .attr("stroke-width", 2);
  } else {
    // Not enough points -> hide line
    svg.select("line.trend-line")
      .transition(t)
      .attr("stroke-width", 0);
  }

  return svgRoot;
}





































//  Visualization 2: Age vs GPA (stacked by age, with hover + legend filter + smooth scaling)
function drawAgeVsGPA(data) {
  console.log("Drawing Age vs GPA (stacked by age)");

  const margin = { top: 20, right: 20, bottom: 50, left: 80 };
  const width  = 600 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;
  const outerWidth  = width  + margin.left + margin.right;
  const outerHeight = height + margin.top  + margin.bottom;

  // --- Reuse / create SVG & core groups once ---
  let svgRoot = d3.select("#vis-age-gpa").select("svg");
  let svg, xAxisG, yAxisG, hoverText, legend;

  if (svgRoot.empty()) {
    svgRoot = d3.select("#vis-age-gpa")
      .append("svg")
      .attr("width",  outerWidth)
      .attr("height", outerHeight);

    svg = svgRoot.append("g")
      .attr("class", "age-chart-root")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Axis groups (once)
    xAxisG = svg.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${height})`);

    yAxisG = svg.append("g")
      .attr("class", "y-axis");

    // Axis labels (once)
    svg.append("text")
      .attr("class", "x-label")
      .attr("x", width / 2)
      .attr("y", height + 40)
      .attr("text-anchor", "middle")
      .text("Count of Students (by age)");

    svg.append("text")
      .attr("class", "y-label")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -60)
      .attr("text-anchor", "middle")
      .text("GPA");

    // Hover text (once)
    hoverText = svg.append("text")
      .attr("id", "age-gpa-hover")
      .attr("x", width - 10)
      .attr("y", height - 5)
      .attr("text-anchor", "end")
      .style("font-size", "12px")
      .style("fill", "#333")
      .text("Hover over a bar segment");

    // Legend group (once)
    legend = svg.append("g")
      .attr("class", "age-legend")
      .attr("transform", `translate(${width - 100}, 0)`);
  } else {
    svgRoot
      .attr("width",  outerWidth)
      .attr("height", outerHeight);

    svg      = svgRoot.select("g.age-chart-root");
    xAxisG   = svg.select(".x-axis");
    yAxisG   = svg.select(".y-axis");
    hoverText = svg.select("#age-gpa-hover");
    legend   = svg.select("g.age-legend");
  }

  // --- Ages present in THIS filtered data (controls bars & legend content) ---
  const agesInData = Array.from(new Set(data.map(d => d.Age))).sort(d3.ascending);

  if (!agesInData.length) {
    console.warn("No data for Age vs GPA.");
    svg.selectAll(".gpa-row").remove();
    legend.selectAll(".legend-item").remove();
    hoverText.text("No data for selected filters");
    return;
  }

  // --- Color: use global mapping so age colors stay consistent ---
  const color = ageColorScale || d3.scaleOrdinal()
    .domain(allAges || agesInData)
    .range(["#08306b", "#6baed6", "#ffd92f", "#b30000"]);

  // --- Bin GPA and build rows ---
  const gpaBin = d3.bin()
    .domain([0, 4.0])
    .value(d => d.GPA)
    .thresholds(40);

  const gpasBinned = gpaBin(data);

  const rows = gpasBinned.map(bin => {
    const counts = {};
    let total = 0;

    agesInData.forEach(age => {
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
  }).filter(r => r.total > 0);

  if (!rows.length) {
    console.warn("No non-empty rows for Age vs GPA.");
    svg.selectAll(".gpa-row").remove();
    legend.selectAll(".legend-item").remove();
    hoverText.text("No data for selected filters");
    return;
  }

  // --- Scales ---
  const x = d3.scaleLinear()
    .domain([0, d3.max(rows, d => d.total)])
    .nice()
    .range([0, width]);

  const y = d3.scaleBand()
    .domain(rows.map(r => r.gpa))
    .range([0, height])
    .padding(0.1);

  // Smooth transition
  const t = d3.transition().duration(800);

  // --- Axes with smooth scaling ---
  xAxisG.transition(t)
    .call(d3.axisBottom(x));

  yAxisG.transition(t)
    .call(d3.axisLeft(y).tickFormat(d3.format(".3f")));

  // --- State for legend filter ---
  let rowGroups = svg.selectAll(".gpa-row")
    .data(rows, d => d.gpa); // key by GPA bin center

  // Exit old rows
  rowGroups.exit()
    .transition(t)
    .style("opacity", 0)
    .remove();

  // Enter new rows
  const rowEnter = rowGroups.enter()
    .append("g")
    .attr("class", "gpa-row")
    .attr("transform", d => `translate(0,${y(d.gpa)})`);

  // Merge rows and animate their vertical position
  rowGroups = rowEnter.merge(rowGroups);
  rowGroups.transition(t)
    .attr("transform", d => `translate(0,${y(d.gpa)})`);

  // Helper: build stacked segments for each row
  function segmentsForRow(row) {
    let acc = 0;
    return agesInData.map(age => {
      const count = row.counts[age] || 0;
      const start = acc;
      acc += count;
      return {
        age: age,
        x0: start,
        x1: acc,
        count: count,
        gpa: row.gpa,
        total: row.total
      };
    }).filter(seg => seg.count > 0);
  }

  // Rects per row (nested selection)
  let rects = rowGroups.selectAll("rect")
    .data(segmentsForRow, d => d.age); // key by age within each row

  // Exit segments
  rects.exit()
    .transition(t)
    .attr("width", 0)
    .remove();

  // Update existing segments (smooth scaling with x)
  rects.transition(t)
    .attr("x", d => x(d.x0))
    .attr("y", 0)
    .attr("width", d => x(d.x1) - x(d.x0))
    .attr("height", y.bandwidth())
    .attr("fill", d => color(d.age));

  // Enter new segments
  const rectsEnter = rects.enter()
    .append("rect")
    .attr("x", d => x(d.x0))
    .attr("y", 0)
    .attr("width", 0) // start at 0 for a nice grow-in
    .attr("height", y.bandwidth())
    .attr("fill", d => color(d.age))
    .attr("opacity", 0.9);

  // Merge for shared event handlers + final size animation
  rects = rectsEnter.merge(rects);

  rects
    .on("mouseover", function (event, seg) {
      // Fade others
      svg.selectAll(".gpa-row rect")
        .attr("opacity", 0.3)
        .attr("stroke", "none");

      d3.select(this)
        .attr("opacity", 1.0)
        .attr("stroke", "black")
        .attr("stroke-width", 1.5);

      hoverText.text(
        `GPA ~ ${seg.gpa.toFixed(2)}, Age ${seg.age}: ${seg.count} students (of ${seg.total})`
      );
    })
    .on("mouseout", function () {
      svg.selectAll(".gpa-row rect").attr("stroke", "none");
      applyAgeFilter();  // restore filter state
    })
    .transition(t)
    .attr("width", d => x(d.x1) - x(d.x0)); // animate to new width

  // --- Legend (only ages present in this filtered data) ---
  let legendItems = legend.selectAll(".legend-item")
    .data(agesInData, d => d);

  // Remove ages not present anymore
  legendItems.exit().remove();

  // Enter new legend items
  const legendEnter = legendItems.enter()
    .append("g")
    .attr("class", "legend-item")
    .style("cursor", "pointer")
    .on("click", (event, age) => {
      // toggle this age; combined filters handled by getCurrentFilteredData()
      selectedAge = (selectedAge === age ? null : age);
      const filteredData = getCurrentFilteredData();
      updateAllVisualizations(filteredData);
    })
    .on("mouseover", function () {
      d3.select(this).select("rect.legend-age")
        .attr("stroke", "black")
        .attr("stroke-width", 2);

      d3.select(this).select("text.legend-age-label")
        .style("font-weight", "bold")
        .style("fill", "#000");
    })
    .on("mouseout", function () {
      applyAgeFilter();
    });

  legendEnter.append("rect")
    .attr("class", "legend-age")
    .attr("width", 12)
    .attr("height", 12)
    .attr("fill", d => color(d));

  legendEnter.append("text")
    .attr("class", "legend-age-label")
    .attr("x", 18)
    .attr("y", 10)
    .text(d => `Age ${d}`);

  // Merge for positioning & styling
  legendItems = legendEnter.merge(legendItems);

  legendItems.attr("transform", (d, i) => `translate(0,${i * 18})`);

  // --- Filter styling helper (bars + legend + hover text) ---
  function applyAgeFilter() {
    // Bars
    svg.selectAll(".gpa-row rect")
      .attr("opacity", d => {
        if (selectedAge === null) return 0.9;
        return d.age === selectedAge ? 0.9 : 0.2;
      });

    // Legend
    legendItems.select("rect.legend-age")
      .attr("stroke", d => (d === selectedAge ? "black" : "none"))
      .attr("stroke-width", d => (d === selectedAge ? 2 : 0));

    legendItems.select("text.legend-age-label")
      .style("font-weight", d => (d === selectedAge ? "bold" : "normal"))
      .style("fill", d => (d === selectedAge ? "#000" : "#444"));

    // Hover text summary
    if (selectedAge === null) {
      hoverText.text("Hover over a bar segment");
    } else {
      const ageData = data.filter(d => d.Age === selectedAge);
      const totalStudents = ageData.length;
      const avgGpa = d3.mean(ageData, d => d.GPA);

      if (!totalStudents || avgGpa == null) {
        hoverText.text(`Age ${selectedAge}: no data`);
      } else {
        hoverText.text(
          `Age ${selectedAge}: ${totalStudents} students, avg GPA ${avgGpa.toFixed(2)}`
        );
      }
    }
  }

  // Initial styling for current filter state
  applyAgeFilter();

  console.log("Age vs GPA drawn (stacked, smooth scaling, stable colors, filtered legend).");
}














































// Visualization 3: Effect of Parental Education/Support on GPA (with legend series toggle)
function drawParentalInfluence(data) {
  console.log("Drawing Effect of Parental Education/Support on GPA");

  const margin = { top: 20, right: 60, bottom: 50, left: 60 };
  const width  = 600 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;
/*
  const svg = d3.select("#vis-parental-gpa")
    .append("svg")
    .attr("width",  width  + margin.left + margin.right)
    .attr("height", height + margin.top  + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
*/



  const svgRoot = d3.select("#vis-parental-gpa")
    .append("svg")
    .attr("width",  width  + margin.left + margin.right)
    .attr("height", height + margin.top  + margin.bottom);

  const svg = svgRoot.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // ---------------------------------
  // GPA binning
  // ---------------------------------
  const binGen = d3.bin()
    .domain([0, 4.0])
    .value(d => d.GPA)
    .thresholds(d3.range(0, 4.0, 0.1));

  const bins = binGen(data);

  const rows = bins.map(bin => {
    const eduSum = d3.sum(bin, d => d.ParentalEducation) || 0;
    const supSum = d3.sum(bin, d => d.ParentalSupport)   || 0;
    const x0     = (bin.x0 === undefined ? 0 : bin.x0);
    const x1     = (bin.x1 === undefined ? 0 : bin.x1);
    const center = (x0 + x1) / 2;
    return { x0, x1, center, eduSum, supSum };
  }).filter(r => (r.eduSum > 0 || r.supSum > 0));

  if (!rows.length) {
    console.warn("No data for Parental Influence.");
    return;
  }

  // ---------------------------------
  // Scales
  // ---------------------------------
  const x = d3.scaleLinear()
    .domain([0, 4.5])
    .range([0, width]);

  const binWidth    = x(rows[0].x1) - x(rows[0].x0);
  const supBarWidth = binWidth * 0.9;
  const eduBarWidth = binWidth * 0.4;

  const yLeft = d3.scaleLinear()
    .domain([0, 160])
    .range([height, 0]);

  const yRight = d3.scaleLinear()
    .domain([0, 200])
    .range([height, 0]);

  // ---------------------------------
  // Axes (keep references so we can hide/show)
  // ---------------------------------
  const xAxisG = svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(
      d3.axisBottom(x)
        .tickValues(d3.range(0, 4.5, 0.5))
        .tickFormat(d3.format(".1f"))
    );

  const yLeftAxisG = svg.append("g")
    .attr("class", "y-axis-left")
    .call(
      d3.axisLeft(yLeft)
        .tickValues([0, 20, 40, 60, 80, 100, 120, 140, 160])
    );

  const yRightAxisG = svg.append("g")
    .attr("class", "y-axis-right")
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

  const eduLabel = svg.append("text")
    .attr("class", "label-edu")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -45)
    .attr("text-anchor", "middle")
    .text("Parental Education");

  const supLabel = svg.append("text")
    .attr("class", "label-sup")
    .attr("transform", "rotate(90)")
    .attr("x", height / 2)
    .attr("y", -width - 45)
    .attr("text-anchor", "middle")
    .text("Parental Support");

  // ---------------------------------
  // Hover text
  // ---------------------------------
  const hoverText = svg.append("text")
    .attr("id", "parental-hover-text")
    .attr("x", width - 10)
    .attr("y", -2)
    .attr("text-anchor", "end")
    .style("font-size", "12px")
    .style("fill", "#333")
    .text("Hover over a bar");

  // ---------------------------------
  // Bars
  // ---------------------------------
  const eduBars = svg.selectAll(".bar-education")
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
      d3.select(this)
        .attr("stroke", "black")
        .attr("stroke-width", 1.5);

      hoverText.text(
        `GPA ~ ${d.center.toFixed(2)} | Education: ${d.eduSum.toFixed(1)}, Support: ${d.supSum.toFixed(1)}`
      );
    })
    .on("mouseout", function () {
      d3.select(this).attr("stroke", "none");
      if (selectedSeries === null) {
        hoverText.text("Hover over a bar");
      }
    });

  const supBars = svg.selectAll(".bar-support")
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
      d3.select(this)
        .attr("stroke", "black")
        .attr("stroke-width", 1.5);

      hoverText.text(
        `GPA ~ ${d.center.toFixed(2)} | Support: ${d.supSum.toFixed(1)}, Education: ${d.eduSum.toFixed(1)}`
      );
    })
    .on("mouseout", function () {
      d3.select(this).attr("stroke", "none");
      if (selectedSeries === null) {
        hoverText.text("Hover over a bar");
      }
    });

  // ---------------------------------
  // Legend + series toggle
  // ---------------------------------
  const legendData = [
    { key: "edu", label: "Parental Education", color: "#1f77b4" },
    { key: "sup", label: "Parental Support",   color: "#ff7f00" }
  ];

  let selectedSeries = null; // null = both; "edu" or "sup"

  function applySeriesFilter() {
    if (selectedSeries === null) {
      // show both series & both axes
      eduBars.attr("opacity", 0.9);
      supBars.attr("opacity", 0.9);

      yLeftAxisG.style("display", null);
      yRightAxisG.style("display", null);
      eduLabel.style("display", null);
      supLabel.style("display", null);

      hoverText.text("Hover over a bar");
    } else if (selectedSeries === "edu") {
      // only education visible
      eduBars.attr("opacity", 0.9);
      supBars.attr("opacity", 0.0);

      yLeftAxisG.style("display", null);
      yRightAxisG.style("display", "none");
      eduLabel.style("display", null);
      supLabel.style("display", "none");

    } else if (selectedSeries === "sup") {
      // only support visible
      eduBars.attr("opacity", 0.0);
      supBars.attr("opacity", 0.9);

      yLeftAxisG.style("display", "none");
      yRightAxisG.style("display", null);
      eduLabel.style("display", "none");
      supLabel.style("display", null);

    }

    // Update legend styling
    legendItems.select("rect.legend-swatch")
      .attr("stroke", d => (selectedSeries === d.key ? "black" : "none"))
      .attr("stroke-width", d => (selectedSeries === d.key ? 2 : 0));

    legendItems.select("text.legend-label")
      .style("font-weight", d => (selectedSeries === d.key ? "bold" : "normal"))
      .style("fill", d => (selectedSeries === d.key ? "#000" : "#444"));
  }

  const legend = svg.append("g")
    .attr("transform", `translate(${width - 160}, 10)`);

  const legendItems = legend.selectAll(".legend-item")
    .data(legendData)
    .enter()
    .append("g")
    .attr("class", "legend-item")
    .attr("transform", (d, i) => `translate(0, ${i * 20})`)
    .style("cursor", "pointer")
    // Click: toggle which series is shown
    .on("click", (event, d) => {
      if (selectedSeries === d.key) {
        selectedSeries = null;   // turn filter off, show both
      } else {
        selectedSeries = d.key;  // show only this series
      }
      applySeriesFilter();
    })
    // Hover: highlight ONLY this legend item (no graph change)
    .on("mouseover", function () {
      d3.select(this).select("rect.legend-swatch")
        .attr("stroke", "black")
        .attr("stroke-width", 2);

      d3.select(this).select("text.legend-label")
        .style("font-weight", "bold")
        .style("fill", "#000");
    })
    .on("mouseout", function () {
      // restore styling to match selectedSeries
      applySeriesFilter();
    });

  legendItems.append("rect")
    .attr("class", "legend-swatch")
    .attr("width", 14)
    .attr("height", 14)
    .attr("fill", d => d.color);

  legendItems.append("text")
    .attr("class", "legend-label")
    .attr("x", 20)
    .attr("y", 11)
    .text(d => d.label);

  // initial state: show both series
  applySeriesFilter();

  console.log("Effect of Parental Education/Support on GPA drawn (with legend series toggle).");

  return svgRoot;
}
