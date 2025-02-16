import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

let data = [];
let commits = [];
let xScale, yScale;
let brushSelection = null;

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
    createScatterplot();
}

function processCommits() {
    commits = d3.groups(data, (d) => d.commit).map(([commit, lines]) => {
        let first = lines[0];
        let { author, date, time, timezone, datetime } = first;
        return {
            id: commit,
            url: 'https://github.com/YOUR_REPO/commit/' + commit,
            author,
            date,
            time,
            timezone,
            datetime,
            hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
            totalLines: lines.length,
            lines: lines
        };
    });
}

function displayStats() {
    const statsDiv = d3.select("#summary-stats").select("dl");
    statsDiv.html("");

    const statsData = [
        { label: "Commits", value: commits.length },
        { label: "Files", value: d3.groups(data, d => d.file).length },
        { label: "Total LOC", value: data.length },
        { label: "Max Depth", value: d3.max(data, d => d.depth) },
        { label: "Longest Line", value: d3.max(data, d => d.length) },
        { label: "Max Lines", value: d3.max(d3.rollups(data, v => v.length, d => d.file), d => d[1]) }
    ];

    statsData.forEach(stat => {
        statsDiv.append("dt").text(stat.label);
        statsDiv.append("dd").text(stat.value);
    });
}

function createScatterplot() {
    const width = 1000;
    const height = 600;
    const margin = { top: 10, right: 10, bottom: 30, left: 50 };

    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };

    const svg = d3.select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');

    const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
    const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

    xScale = d3.scaleTime()
        .domain(d3.extent(commits, (d) => d.datetime))
        .range([usableArea.left, usableArea.right])
        .nice();

    yScale = d3.scaleLinear()
        .domain([0, 24])
        .range([usableArea.bottom, usableArea.top]);

    // Add Grid Lines BEFORE dots
    const gridlines = svg.append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`);

    gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

    // Add Axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale).tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

    svg.append('g')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .call(xAxis);

    svg.append('g')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(yAxis);

    // Enable brushing
    svg.append("g")
        .attr("class", "brush")
        .call(d3.brush().extent([[0, 0], [width, height]]).on('brush end', brushed));

    const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

    const dots = svg.append('g').attr('class', 'dots');

    dots.selectAll('circle')
        .data(sortedCommits)
        .join('circle')
        .attr('cx', (d) => xScale(d.datetime))
        .attr('cy', (d) => yScale(d.hourFrac))
        .attr('r', (d) => rScale(d.totalLines))
        .attr('fill', (d) =>
            d.hourFrac < 6 || d.hourFrac > 18 ? "steelblue" : "orange"
        )
        .style('fill-opacity', 0.7)
        .on('mouseenter', function (event, d) {
            d3.select(event.currentTarget).style('fill-opacity', 1);
            updateTooltipContent(d);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on('mousemove', (event) => updateTooltipPosition(event))
        .on('mouseleave', function () {
            d3.select(event.currentTarget).style('fill-opacity', 0.7);
            updateTooltipContent({});
            updateTooltipVisibility(false);
        });
}

function brushed(event) {
    brushSelection = event.selection;
    updateSelection();
    updateSelectionCount();
    updateLanguageBreakdown();
}

function isCommitSelected(commit) {
    if (!brushSelection) return false;

    const min = { x: brushSelection[0][0], y: brushSelection[0][1] };
    const max = { x: brushSelection[1][0], y: brushSelection[1][1] };
    const x = xScale(commit.datetime);
    const y = yScale(commit.hourFrac);

    return x >= min.x && x <= max.x && y >= min.y && y <= max.y;
}

function updateSelection() {
    d3.selectAll('circle').classed('selected', (d) => isCommitSelected(d));
}

function updateSelectionCount() {
    const selectedCommits = brushSelection
        ? commits.filter(isCommitSelected)
        : [];

    document.getElementById('selection-count').textContent = `${
        selectedCommits.length || 'No'
    } commits selected`;
}

function updateLanguageBreakdown() {
    const selectedCommits = brushSelection
        ? commits.filter(isCommitSelected)
        : [];
    const container = document.getElementById('language-breakdown');

    if (selectedCommits.length === 0) {
        container.innerHTML = '';
        return;
    }

    const lines = selectedCommits.flatMap((d) => d.lines);
    
    
    // Use d3.rollup to count lines per language
    const breakdown = d3.rollup(
        lines,
        (v) => v.length,
        (d) => d.type
    );

    // Update DOM with breakdown
    container.innerHTML = '';
    for (const [language, count] of breakdown) {
        const proportion = count / lines.length;
        const formatted = d3.format('.1~%')(proportion);

        container.innerHTML += `
            <div>
                <dt>${language}</dt>
                <dd>${count} lines</dd>
                <dd>(${formatted})</dd>
            </div>
        `;
    }
}

// Tooltip Functions (Only This Part Is Modified)
function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');
    const tooltipWidth = tooltip.offsetWidth;
    const tooltipHeight = tooltip.offsetHeight;

    // Adjust position to prevent tooltip from going off screen
    let xPos = event.clientX + 10;
    let yPos = event.clientY + 10;

    if (xPos + tooltipWidth > window.innerWidth) {
        xPos = event.clientX - tooltipWidth - 10;
    }
    if (yPos + tooltipHeight > window.innerHeight) {
        yPos = event.clientY - tooltipHeight - 10;
    }

    tooltip.style.left = `${xPos}px`;
    tooltip.style.top = `${yPos}px`;
}

function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.style.opacity = isVisible ? 1 : 0;
    tooltip.style.visibility = isVisible ? "visible" : "hidden";
}

function updateTooltipContent(commit) {
    const link = document.getElementById('commit-link');
    const date = document.getElementById('commit-date');

    if (!commit.id) {
        updateTooltipVisibility(false);
        return;
    }

    link.href = commit.url;
    link.textContent = commit.id;
    date.textContent = commit.datetime?.toLocaleString('en', {
        dateStyle: 'full',
    });

    updateTooltipVisibility(true);
}
