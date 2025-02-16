import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

let data = [];
let commits = [];

document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
});

async function loadData() {
    data = await d3.csv('loc.csv', (row) => ({
        ...row,
        line: Number(row.line),
        depth: Number(row.depth),
        length: Number(row.length),
        date: new Date(row.date + 'T00:00' + row.timezone),
        datetime: new Date(row.datetime),
        hourFrac: new Date(row.datetime).getHours() + new Date(row.datetime).getMinutes() / 60,
    }));

    processCommits();
    displayStats();
    createScatterplot();  // Call scatterplot function
}

function processCommits() {
    commits = d3.groups(data, (d) => d.commit).map(([commit, lines]) => {
        let first = lines[0];
        let { author, date, time, timezone, datetime } = first;
        let ret = {
            id: commit,
            url: 'https://github.com/YOUR_REPO/commit/' + commit,
            author,
            date,
            time,
            timezone,
            datetime,
            hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
            totalLines: lines.length,
        };

        Object.defineProperty(ret, 'lines', {
            value: lines,
            enumerable: false, // Hide from console
            configurable: false,
            writable: false,
        });

        return ret;
    });
}

function displayStats() {
    const statsDiv = d3.select("#summary-stats");

    // Clear existing stats before re-rendering
    statsDiv.html("");

    // Add a heading
    statsDiv.append("h2").text("Summary");

    // Create the stats list using <dl>
    const dl = statsDiv.append("dl");

    // Define the stats to display
    const statsData = [
        { label: "Commits", value: commits.length },
        { label: "Files", value: d3.groups(data, d => d.file).length },
        { label: "Total LOC", value: data.length },
        { label: "Max Depth", value: d3.max(data, d => d.depth) },
        { label: "Longest Line", value: d3.max(data, d => d.length) },
        { label: "Max Lines", value: d3.max(d3.rollups(data, v => v.length, d => d.file), d => d[1]) }
    ];

    // Append stats dynamically
    statsData.forEach(stat => {
        dl.append("dt").text(stat.label);
        dl.append("dd").text(stat.value);
    });
}

function createScatterplot() {
    const width = 1000;
    const height = 600;
    const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
    const rScale = d3
    .scaleSqrt()  // Uses square root scaling for better visual balance
    .domain([minLines, maxLines])
    .range([2, 30]);  // Adjust these values if needed
  
    const margin = { top: 10, right: 10, bottom: 30, left: 50 };
    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };

    // Create SVG
    const svg = d3.select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');

    // Define scales
    const xScale = d3
        .scaleTime()
        .domain(d3.extent(commits, (d) => d.datetime))
        .range([usableArea.left, usableArea.right])
        .nice();

    const yScale = d3
        .scaleLinear()
        .domain([0, 24])
        .range([usableArea.bottom, usableArea.top]);

    // Add Grid Lines BEFORE the axes
    const gridlines = svg
    .append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left}, 0)`);

    // Create subtle gridlines with full-width ticks
    gridlines.call(
    d3.axisLeft(yScale)
        .tickFormat('')  // Hide labels for gridlines
        .tickSize(-usableArea.width)  // Extend ticks across the chart
    );

    // Apply styles directly (optional but good practice)
    gridlines.selectAll('line')
    .style('stroke', 'lightgray')
    .style('stroke-opacity', 0.5)
    .style('shape-rendering', 'crispEdges');

    // Add Axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale).tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

    svg.append('g')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .call(xAxis);

    svg.append('g')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(yAxis);

    // Add Scatterplot Dots
    const dots = svg.append('g').attr('class', 'dots');
    dots.selectAll('circle')
    .data(commits)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines)) // Use rScale for radius
    .attr('fill', (d) =>
        d.hourFrac < 6 || d.hourFrac > 18 ? "steelblue" : "orange"
    ) // Color based on time of day
    .style('fill-opacity', 0.7)  // Reduce opacity for better visualization
    .on('mouseenter', function (event, d) {
        d3.select(event.currentTarget).style('fill-opacity', 1); // Highlight on hover
        updateTooltipContent(d);
        updateTooltipVisibility(true);
        updateTooltipPosition(event);
    })
    .on('mousemove', (event) => {
        updateTooltipPosition(event); // Keep tooltip near cursor
    })
    .on('mouseleave', function () {
        d3.select(event.currentTarget).style('fill-opacity', 0.7); // Restore opacity
        updateTooltipContent({});
        updateTooltipVisibility(false);
    });

    
}

function updateTooltipContent(commit) {
    const link = document.getElementById('commit-link');
    const date = document.getElementById('commit-date');
    const time = document.getElementById('commit-time');
    const author = document.getElementById('commit-author');
    const lines = document.getElementById('commit-lines');
  
    if (!commit || Object.keys(commit).length === 0) {
      link.textContent = "";
      link.href = "#";
      date.textContent = "";
      time.textContent = "";
      author.textContent = "";
      lines.textContent = "";
      return;
    }
  
    link.href = commit.url;
    link.textContent = commit.id;
    date.textContent = commit.datetime?.toLocaleString('en', { dateStyle: 'full' });
    time.textContent = commit.datetime?.toLocaleTimeString();
    author.textContent = commit.author;
    lines.textContent = commit.totalLines;
  }
  
  function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.hidden = !isVisible;
  }
  
  function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.style.left = `${event.clientX + 10}px`;
    tooltip.style.top = `${event.clientY + 10}px`;
  }
  