//set up SVG dimensions/margins
const margin = { top: 40, right: 50, bottom: 70, left: 60 },
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

//append SVG object to the body of the page
const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

//setup tooltip
const tooltip = d3.select(".tooltip");

//load the data
d3.csv("data/hall_of_fame_data.csv").then(function (rawData) {
    console.log(rawData);
    //extract categories for dropdown menu
    const categories = Array.from(new Set(rawData.map(d => d.category)));
    categories.forEach(category => {
        d3.select("#categorySelect")
            .append("option")
            .attr("value", category)
            .text(category);
    });

    //aggregate the data for y-axis scaling
    const aggregatedData = d3.group(rawData, d => d.class_year);
    const allData = Array.from(aggregatedData, ([key, values]) => ({
        year: +key,
        male: values.filter(d => d.gender === "male").length,
        female: values.filter(d => d.gender === "female").length,
        mixed: values.filter(d => d.gender === "mixed").length
    }));

    //calculate the extent for y-axis
    const maxYValue = d3.max(allData, d => d.male + Math.max(d.female, d.mixed));
    //subgroups list (male, female, mixed)
    const subgroups = ["male", "female", "mixed"];
    //years list (1986 to 2024)
    const years = Array.from(new Set(allData.map(d => d.year)));
    //x and y scales
    const x = d3.scaleBand()
        .domain(years)
        .range([0, width])
        .padding([0.3]); //space out the bars

    const y = d3.scaleLinear()
        .domain([-10, maxYValue]) //lower limit to -10 for y
        .range([height, 0]);

    //X axis
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")).tickValues(years.filter((d, i) => i % 2 === 0))) //display every 2 years
        .selectAll("text")
        .style("font-size", "12px");

    //Y axis
    svg.append("g")
        .call(d3.axisLeft(y).tickFormat(d => Math.abs(d))); //convert negative ticks to positive

    //add the black x-axis line at y=0
    svg.append("line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", y(0))
        .attr("y2", y(0))
        .attr("stroke", "black");

    //color palette for bars
    const color = d3.scaleOrdinal()
        .domain(subgroups)
        .range(["#000080", "#d94f70", "#5a4e7a"]);

    //initial rendering
    updateChart(rawData, "All");

    //guided walkthrough
    let currentIndex = 0;
    const categoryHeader = d3.select("#categoryHeader");

    function showNextCategory() {
        if (currentIndex < categories.length) {
            const selectedCategory = categories[currentIndex];
            categoryHeader.text(`Category: ${selectedCategory}`);
            const filteredData = rawData.filter(d => d.category === selectedCategory);
            updateChart(filteredData, selectedCategory);
            currentIndex++;
            setTimeout(showNextCategory, 3000); //change category every 3 seconds
        } else {
            //enable the dropdown menu after the walkthrough
            d3.select("#categorySelect").attr("disabled", null);
            categoryHeader.text("Explore the data by selecting a category and hovering over the bars:");
        }
    }
    setTimeout(showNextCategory, 3000);

    //event listener for the dropdown menu
    d3.select("#categorySelect").on("change", function () {
        const selectedCategory = d3.select(this).property("value");
        const filteredData = selectedCategory === "all" ? rawData : rawData.filter(d => d.category === selectedCategory);
        updateChart(filteredData, selectedCategory);
        categoryHeader.text(`Category: ${selectedCategory}`);
    });

    function updateChart(filteredData, selectedCategory) {
        //clear the prev chart
        svg.selectAll("*").remove();
        //aggregate the data
        const groupedData = d3.group(filteredData, d => d.class_year);
        const data = Array.from(groupedData, ([key, values]) => ({
            year: +key,
            male: values.filter(d => d.gender === "male").length,
            female: values.filter(d => d.gender === "female").length,
            mixed: values.filter(d => d.gender === "mixed").length
        }));

        console.log(data); //log the aggregated data

        //X axis
        svg.append("g")
            .attr("transform", `translate(0, ${height})`)
            .call(d3.axisBottom(x).tickFormat(d3.format("d")).tickValues(years.filter((d, i) => i % 2 === 0))) //display every 2 years
            .selectAll("text")
            .style("font-size", "12px");

        //Y axis
        svg.append("g")
            .call(d3.axisLeft(y).tickFormat(d => Math.abs(d))); //convert negative ticks to positive

        //add the black x-axis line at y=0
        svg.append("line")
            .attr("x1", 0)
            .attr("x2", width)
            .attr("y1", y(0))
            .attr("y2", y(0))
            .attr("stroke", "black");

        //stack the data for positive and negative values
        const positiveStackedData = d3.stack()
            .keys(["male"])
            (data);

        const negativeStackedData = d3.stack()
            .keys(["female", "mixed"])
            (data);

        console.log(positiveStackedData);
        console.log(negativeStackedData); 

        //show the bars with transition and tooltip
        svg.append("g")
            .selectAll("g")
            .data(positiveStackedData)
            .enter().append("g")
            .attr("fill", d => color(d.key))
            .selectAll("rect")
            .data(d => d)
            .enter().append("rect")
            .attr("x", d => x(d.data.year))
            .attr("y", y(0))
            .attr("height", 0)
            .attr("width", x.bandwidth())
            .on("mouseover", function (event, d) {
                const year = d.data.year;
                const value = d.data.male;
                tooltip.transition().duration(200).style("opacity", .9);
                tooltip.html(`Year: ${year}<br>Male: ${value}`)
                    .style("left", (event.pageX + 5) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function (d) {
                tooltip.transition().duration(500).style("opacity", 0);
            })
            .transition()
            .duration(1000)
            .attr("y", d => y(d[1]))
            .attr("height", d => y(d[0]) - y(d[1]));

        svg.append("g")
            .selectAll("g")
            .data(negativeStackedData)
            .enter().append("g")
            .attr("fill", d => color(d.key))
            .selectAll("rect")
            .data(d => d)
            .enter().append("rect")
            .attr("x", d => x(d.data.year))
            .attr("y", y(0))
            .attr("height", 0)
            .attr("width", x.bandwidth())
            .on("mouseover", function (event, d) {
                const year = d.data.year;
                const femaleValue = d.data.female;
                const mixedValue = d.data.mixed;
                tooltip.transition().duration(200).style("opacity", .9);
                tooltip.html(`Year: ${year}<br>Female: ${femaleValue}<br>Mixed: ${mixedValue}`)
                    .style("left", (event.pageX + 5) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function (d) {
                tooltip.transition().duration(500).style("opacity", 0);
            })
            .transition()
            .duration(1000)
            .attr("y", d => y(-d[0])) 
            .attr("height", d => y(-d[1]) - y(-d[0]));

        //add legend
        const legend = svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${width - 100},${-margin.top})`);

        subgroups.forEach((key, i) => {
            const legendRow = legend.append("g")
                .attr("transform", `translate(0, ${i * 20})`);

            legendRow.append("rect")
                .attr("width", 18)
                .attr("height", 18)
                .attr("fill", color(key));

            legendRow.append("text")
                .attr("x", 24)
                .attr("y", 9)
                .attr("dy", ".35em")
                .text(key.charAt(0).toUpperCase() + key.slice(1));
        });

        //add the annotation text bubble
        const totalMen = filteredData.filter(d => d.gender === "male").length;
        const totalWomen = filteredData.filter(d => d.gender === "female").length;
        const totalInductees = totalMen + totalWomen;
        const percentWomen = totalInductees ? (totalWomen / totalInductees * 100).toFixed(2) : 0;

        const annotationText = `In the ${selectedCategory} category:
Number of men inducted: ${totalMen}
Number of women inducted: ${totalWomen}
Percentage of women inductees: ${percentWomen}%`;

        d3.select(".annotation-box").remove(); //remove previous annotation box if exists

        //ensure correct SVG positioning
        const svgElement = d3.select("#chart svg").node();
        const svgPosition = svgElement.getBoundingClientRect();

        //add annotation box to the body
        d3.select("body")
            .append("div")
            .attr("class", "annotation-box")
            .style("top", `${svgPosition.top + 275}px`) 
            .style("left", `${svgPosition.left + width + 70}px`)
            .html(annotationText.replace(/\n/g, "<br>")); //convert newlines to HTML line breaks

    }
}).catch(function (error) {
    console.log("Error loading/processing data:", error);
});
