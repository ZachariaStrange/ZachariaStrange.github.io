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

