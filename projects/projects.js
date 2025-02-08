import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

async function loadProjects() {
    // **Fetch project data**
    const projects = await fetchJSON('../lib/projects.json');

    // **Get references to the DOM elements**
    const projectsContainer = document.querySelector('.projects');
    const projectsTitle = document.querySelector('.projects-title');
    const searchInput = document.querySelector('.searchBar');

    // **Set project count**
    if (projectsTitle) {
        projectsTitle.textContent = `${projects.length} Projects`;
    }

    // **Render all projects initially**
    renderProjects(projects, projectsContainer, 'h2');
    renderPieChart(projects); // Initial pie chart

    // **Step 4: Search Functionality**
    searchInput.addEventListener('input', (event) => {
        let query = event.target.value.toLowerCase(); // Case insensitive search

        let filteredProjects = projects.filter((project) => {
            let values = Object.values(project).join('\n').toLowerCase();
            return values.includes(query);
        });

        // **Re-render filtered projects & update pie chart**
        renderProjects(filteredProjects, projectsContainer, 'h2');
        renderPieChart(filteredProjects);
    });
}

// **Step 3: Pie Chart Rendering Function**
function renderPieChart(projectsGiven) {
    let selectedIndex = -1; // Track selected pie slice

    // **Step 3.1: Count projects per year**
    let rolledData = d3.rollups(
        projectsGiven,
        (v) => v.length,
        (d) => d.year
    );

    // **Step 3.2: Convert to pie chart format**
    let data = rolledData.map(([year, count]) => ({
        value: count,
        label: year
    }));

    // **Step 3.3: Define Color Scale & Slice Generator**
    let colors = d3.scaleOrdinal(d3.schemeTableau10);
    let sliceGenerator = d3.pie().value((d) => d.value);
    let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);

    // **Step 3.4: Clear old elements before re-rendering**
    let newSVG = d3.select("#projects-plot");
    newSVG.selectAll("path").remove();

    let legend = d3.select('.legend');
    legend.html(''); // Clear legend

    // **Step 3.5: Generate Pie Chart**
    let arcData = sliceGenerator(data);
    let arcs = arcData.map((d) => arcGenerator(d));

    arcs.forEach((arc, idx) => {
        let path = newSVG.append("path")
            .attr("d", arc)
            .attr("fill", colors(idx))
            .attr("data-year", data[idx].label) // Store year in a data attribute
            .on("click", function () {
                let isSelected = d3.select(this).classed("selected");
    
                // Remove selection from all slices
                d3.selectAll("path").classed("selected", false);
    
                if (!isSelected) {
                    // If not already selected, mark it as selected
                    d3.select(this).classed("selected", true);
                    selectedIndex = idx;
    
                    // **Filter projects by the selected year**
                    let selectedYear = data[idx].label;
                    let filteredProjects = projectsGiven.filter(p => p.year === selectedYear);
                    renderProjects(filteredProjects, document.querySelector('.projects'), 'h2');
                } else {
                    // If already selected, deselect and show all projects
                    selectedIndex = -1;
                    renderProjects(projectsGiven, document.querySelector('.projects'), 'h2');
                }
    
                // **Update legend highlighting**
                d3.selectAll(".legend li").classed("selected", false);
                if (!isSelected) {
                    d3.selectAll(`.legend li:nth-child(${idx + 1})`).classed("selected", true);
                }
            });
    });
    

    // **Step 3.6: Generate Legend**
    data.forEach((d, idx) => {
        legend.append('li')
              .attr('style', `--color:${colors(idx)}`)
              .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
    });
}

// **Call function to load projects & visualization**
loadProjects();
