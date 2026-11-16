import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

let xScale;
let yScale;

async function loadData() {
    return d3.csv('loc.csv', (row) => ({
        ...row,
        line: Number(row.line),
        depth: Number(row.depth),
        length: Number(row.length),
        date: new Date(row.date + 'T00:00' + row.timezone),
        datetime: new Date(row.datetime),
    }));
}

function processCommits(data) {
    return d3.groups(data, (d) => d.commit).map(([commit, lines]) => {
        const { author, date, time, timezone, datetime } = lines[0];

        const ret = {
            id: commit,
            url: 'https://github.com/CYF-Grace/portfolio/commit/' + commit,
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
            enumerable: false,
            writable: false,
            configurable: false,
        });

        return ret;
    });
}

function renderCommitInfo(data, commits) {
    const container = d3.select('#stats');
    container.selectAll('*').remove();

    const dl = container.append('dl').attr('class', 'stats');

    const fileLengths = d3.rollups(
        data,
        (lines) => d3.max(lines, (d) => d.line),
        (d) => d.file
    );

    const stats = [
        ['Total LOC', d3.format(',')(data.length)],
        ['Total commits', d3.format(',')(commits.length)],
        ['Files', d3.format(',')(fileLengths.length)],
        [
            'Average file length',
            d3.format(',.1f')(d3.mean(fileLengths, (d) => d[1])) + ' lines',
        ],
        [
            'Longest line',
            d3.format(',')(d3.max(data, (d) => d.length)) + ' characters',
        ],
        ['Maximum depth', d3.max(data, (d) => d.depth)],
    ];

    for (const [label, value] of stats) {
        dl.append('dt').text(label);
        dl.append('dd').text(value);
    }
}

function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');
    const gap = 12;
    const { width, height } = tooltip.getBoundingClientRect();

    let left = event.clientX + gap;
    let top = event.clientY + gap;

    if (left + width > window.innerWidth - gap) {
        left = event.clientX - width - gap;
    }

    if (top + height > window.innerHeight - gap) {
        top = event.clientY - height - gap;
    }

    tooltip.style.left = `${Math.max(gap, left)}px`;
    tooltip.style.top = `${Math.max(gap, top)}px`;
}

function renderTooltipContent(commit) {
    if (!commit || Object.keys(commit).length === 0) {
        return;
    }

    const link = document.getElementById('commit-link');

    link.href = commit.url;
    link.textContent = commit.id;

    document.getElementById('commit-date').textContent =
        commit.datetime.toLocaleDateString('en-US', {
            dateStyle: 'full',
        });

    document.getElementById('commit-tooltip-time').textContent =
        commit.datetime.toLocaleTimeString('en-US', {
            timeStyle: 'short',
        });

    document.getElementById('commit-author').textContent = commit.author;

    document.getElementById('commit-lines').textContent =
        commit.totalLines.toLocaleString('en-US');
}

function isCommitSelected(selection, commit) {
    if (!selection) {
        return false;
    }

    const [[x0, y0], [x1, y1]] = selection;
    const x = xScale(commit.datetime);
    const y = yScale(commit.hourFrac);

    return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

function renderSelectionCount(selectedCommits) {
    const count = selectedCommits.length;
    const countElement = document.getElementById('selection-count');

    countElement.textContent =
        count === 0
            ? 'No commits selected'
            : `${count} commit${count === 1 ? '' : 's'} selected`;
}

function renderLanguageBreakdown(selectedCommits) {
    const container = d3.select('#language-breakdown');
    container.selectAll('*').remove();

    if (selectedCommits.length === 0) {
        return;
    }

    const lines = selectedCommits.flatMap((commit) => commit.lines);
    const breakdown = d3.rollup(
        lines,
        (group) => group.length,
        (line) => line.type
    );

    for (const [language, count] of breakdown) {
        const proportion = count / lines.length;

        container.append('dt').text(language);

        container
            .append('dd')
            .text(
                `${count.toLocaleString('en-US')} lines (${d3.format('.1~%')(proportion)})`
            );
    }
}

function brushed(event) {
    const selection = event.selection;
    const selectedCommits = selection
        ? filteredCommits.filter((commit) => isCommitSelected(selection, commit))
        : [];

    d3.select('#chart')
        .selectAll('.dots circle')
        .classed('selected', (commit) =>
            isCommitSelected(selection, commit)
        );

    renderSelectionCount(selectedCommits);
    renderLanguageBreakdown(selectedCommits);
}

function createBrushSelector(svg, usableArea) {
    const brush = d3
        .brush()
        .extent([
            [usableArea.left, usableArea.top],
            [usableArea.right, usableArea.bottom],
        ])
        .on('start brush end', brushed);

    svg.call(brush);
    svg.select('.dots').raise();
}

function renderScatterPlot() {
    const width = 1000;
    const height = 600;
    const margin = {
        top: 30,
        right: 30,
        bottom: 60,
        left: 70,
    };

    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };

    const container = d3.select('#chart');
    container.selectAll('*').remove();

    const svg = container
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');

    xScale = d3
        .scaleTime()
        .range([usableArea.left, usableArea.right]);

    yScale = d3
        .scaleLinear()
        .domain([0, 24])
        .range([usableArea.top, usableArea.bottom]);

    const gridlines = svg
        .append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`);

    gridlines.call(
        d3
            .axisLeft(yScale)
            .tickValues(d3.range(0, 25, 3))
            .tickFormat('')
            .tickSize(-usableArea.width)
    );

    const yAxis = d3
        .axisLeft(yScale)
        .tickValues(d3.range(0, 25, 3))
        .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

    svg
        .append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0, ${usableArea.bottom})`);

    svg
        .append('g')
        .attr('class', 'y-axis')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(yAxis);

    svg
        .append('text')
        .attr('class', 'axis-label')
        .attr('x', (usableArea.left + usableArea.right) / 2)
        .attr('y', height - 12)
        .attr('text-anchor', 'middle')
        .attr('fill', 'currentColor')
        .text('Commit date');

    svg
        .append('text')
        .attr('class', 'axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('x', -(usableArea.top + usableArea.bottom) / 2)
        .attr('y', 16)
        .attr('text-anchor', 'middle')
        .attr('fill', 'currentColor')
        .text('Time of day (local)');

    svg.append('g').attr('class', 'dots');
    createBrushSelector(svg, usableArea);
}

function updateScatterPlot(visibleCommits) {
    const svg = d3.select('#chart').select('svg');

    xScale
        .domain(d3.extent(visibleCommits, (d) => d.datetime))
        .nice();

    svg.select('g.x-axis').call(d3.axisBottom(xScale).ticks(6));

    const rScale = d3
        .scaleSqrt()
        .domain(d3.extent(visibleCommits, (d) => d.totalLines))
        .range([3, 20]);

    const sortedCommits = d3.sort(visibleCommits, (d) => -d.totalLines);

    updateTooltipVisibility(false);

    svg
        .select('g.dots')
        .selectAll('circle')
        .data(sortedCommits, (commit) => commit.id)
        .join('circle')
        .attr('cx', (d) => xScale(d.datetime))
        .attr('cy', (d) => yScale(d.hourFrac))
        .attr('r', (d) => rScale(d.totalLines))
        .attr('fill', 'steelblue')
        .style('fill-opacity', 0.7)
        .on('mouseenter', (event, commit) => {
            d3.select(event.currentTarget).style('fill-opacity', 1);

            renderTooltipContent(commit);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on('mousemove', updateTooltipPosition)
        .on('mouseleave', (event) => {
            d3.select(event.currentTarget).style('fill-opacity', 0.7);
            updateTooltipVisibility(false);
        });

    brushed({ selection: d3.brushSelection(svg.node()) });
}

const lineColors = d3.scaleOrdinal(d3.schemeTableau10);

function updateFileDisplay(visibleCommits) {
    const lines = visibleCommits.flatMap((commit) => commit.lines);

    const files = d3
        .groups(lines, (line) => line.file)
        .map(([name, lines]) => ({ name, lines }))
        .sort((a, b) => b.lines.length - a.lines.length);

    const fileRows = d3
        .select('#files')
        .selectAll(':scope > div')
        .data(files, (file) => file.name)
        .join((enter) =>
            enter.append('div').call((row) => {
                const label = row.append('dt');
                label.append('code');
                label.append('small');
                row.append('dd');
            })
        );

    fileRows.select('dt > code').text((file) => file.name);

    fileRows.select('dt > small').text((file) => {
        const count = file.lines.length;
        return `${count} ${count === 1 ? 'line' : 'lines'}`;
    });

    fileRows
        .select('dd')
        .selectAll('.loc')
        .data((file) => file.lines)
        .join('div')
        .attr('class', 'loc')
        .style('--color', (line) => lineColors(line.type));
}

const data = await loadData();
const commits = processCommits(data);
let filteredCommits = commits;

const commitSlider = document.getElementById('commit-progress');
const commitTime = document.getElementById('commit-time');

const timeScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (commit) => commit.datetime))
    .range([0, 100]);

function setCommitCutoff(cutoff) {
    commitTime.dateTime = cutoff.toISOString();
    commitTime.textContent = cutoff.toLocaleString('en-US', {
        dateStyle: 'long',
        timeStyle: 'short',
    });

    filteredCommits = commits.filter((commit) => commit.datetime <= cutoff);
    updateScatterPlot(filteredCommits);
    updateFileDisplay(filteredCommits);
}

function onTimeSliderChange() {
    const progress = Number(commitSlider.value);
    setCommitCutoff(timeScale.invert(progress));
}

renderCommitInfo(data, commits);
renderScatterPlot();

commitSlider.addEventListener('input', onTimeSliderChange);
commitSlider.value = '0';
onTimeSliderChange();

const storyCommits = d3.sort(commits, (commit) => commit.datetime);

function renderCommitStory(selector) {
    const steps = d3
        .select(selector)
        .selectAll('.step')
        .data(storyCommits, (commit) => commit.id)
        .join('div')
        .attr('class', 'step');

    steps.append('h3').text((commit) =>
        commit.datetime.toLocaleString('en-US', {
            dateStyle: 'long',
            timeStyle: 'short',
        })
    );

    steps
        .append('a')
        .attr('href', (commit) => commit.url)
        .attr('target', '_blank')
        .attr('rel', 'noopener noreferrer')
        .text('View this commit on GitHub');

    steps.append('p').text((commit) => {
        const lineCount = commit.totalLines;
        const fileCount = new Set(commit.lines.map((line) => line.file)).size;

        return `I edited ${lineCount.toLocaleString('en-US')} ${lineCount === 1 ? 'line' : 'lines'} across ${fileCount} ${fileCount === 1 ? 'file' : 'files'}.`;
    });
}

function onCommitStepEnter({ element }) {
    const commit = d3.select(element).datum();

    commitSlider.value = String(Math.round(timeScale(commit.datetime)));
    setCommitCutoff(commit.datetime);
}

renderCommitStory('#scatter-story');
renderCommitStory('#file-story');

const scatterScroller = scrollama();
scatterScroller
    .setup({
        step: '#scatter-story .step',
        offset: 0.5,
    })
    .onStepEnter(onCommitStepEnter);

const fileScroller = scrollama();
fileScroller
    .setup({
        step: '#file-story .step',
        offset: 0.5,
    })
    .onStepEnter(onCommitStepEnter);