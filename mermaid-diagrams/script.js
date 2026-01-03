// Example diagrams
const examples = {
    flowchart: `graph TD
    A[Start] --> B{Is it?}
    B -->|Yes| C[OK]
    C --> D[Rethink]
    D --> B
    B ---->|No| E[End]`,

    sequence: `sequenceDiagram
    participant Alice
    participant Bob
    Alice->>John: Hello John, how are you?
    loop Healthcheck
        John->>John: Fight against hypochondria
    end
    Note right of John: Rational thoughts!
    John-->>Alice: Great!
    John->>Bob: How about you?
    Bob-->>John: Jolly good!`,

    class: `classDiagram
    Animal <|-- Duck
    Animal <|-- Fish
    Animal <|-- Zebra
    Animal : +int age
    Animal : +String gender
    Animal: +isMammal()
    Animal: +mate()
    class Duck{
        +String beakColor
        +swim()
        +quack()
    }
    class Fish{
        -int sizeInFeet
        -canEat()
    }
    class Zebra{
        +bool is_wild
        +run()
    }`,

    state: `stateDiagram-v2
    [*] --> Still
    Still --> [*]
    Still --> Moving
    Moving --> Still
    Moving --> Crash
    Crash --> [*]`,

    er: `erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
    CUSTOMER }|..|{ DELIVERY-ADDRESS : uses
    CUSTOMER {
        string name
        string custNumber
        string sector
    }
    ORDER {
        int orderNumber
        string deliveryAddress
    }
    LINE-ITEM {
        string productCode
        int quantity
        float pricePerUnit
    }`,

    gantt: `gantt
    title A Gantt Diagram
    dateFormat  YYYY-MM-DD
    section Section
    A task           :a1, 2024-01-01, 30d
    Another task     :after a1  , 20d
    section Another
    Task in sec      :2024-01-12  , 12d
    another task      : 24d`,

    pie: `pie title Pets adopted by volunteers
    "Dogs" : 386
    "Cats" : 85
    "Rats" : 15`,

    journey: `journey
    title My working day
    section Go to work
      Make tea: 5: Me
      Go upstairs: 3: Me
      Do work: 1: Me, Cat
    section Go home
      Go downstairs: 5: Me
      Sit down: 5: Me`,

    git: `gitGraph
    commit
    commit
    branch develop
    checkout develop
    commit
    commit
    checkout main
    merge develop
    commit
    commit`
};

// DOM elements
const diagramInput = document.getElementById('diagram-input');
const diagramOutput = document.getElementById('diagram-output');
const errorOutput = document.getElementById('error-output');
const renderBtn = document.getElementById('render-btn');
const clearBtn = document.getElementById('clear-btn');
const exampleSelect = document.getElementById('example-select');

// Render diagram
async function renderDiagram() {
    const code = diagramInput.value.trim();

    if (!code) {
        showError('Please enter some Mermaid code');
        return;
    }

    try {
        // Clear previous diagram
        diagramOutput.innerHTML = '';
        errorOutput.style.display = 'none';

        // Create a unique ID for this diagram
        const id = 'mermaid-' + Date.now();

        // Render the diagram
        const { svg } = await window.mermaid.render(id, code);

        // Display the SVG
        diagramOutput.innerHTML = svg;

    } catch (error) {
        showError('Error rendering diagram: ' + error.message);
        console.error('Mermaid error:', error);
    }
}

// Show error message
function showError(message) {
    errorOutput.textContent = message;
    errorOutput.style.display = 'block';
    diagramOutput.innerHTML = '<p style="color: #999; text-align: center;">Diagram will appear here</p>';
}

// Clear editor
function clearEditor() {
    diagramInput.value = '';
    diagramOutput.innerHTML = '<p style="color: #999; text-align: center;">Diagram will appear here</p>';
    errorOutput.style.display = 'none';
}

// Load example
function loadExample() {
    const exampleType = exampleSelect.value;
    if (exampleType && examples[exampleType]) {
        diagramInput.value = examples[exampleType];
        renderDiagram();
    }
    exampleSelect.value = '';
}

// Event listeners
renderBtn.addEventListener('click', renderDiagram);
clearBtn.addEventListener('click', clearEditor);
exampleSelect.addEventListener('change', loadExample);

// Keyboard shortcut: Ctrl+Enter or Cmd+Enter to render
diagramInput.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        renderDiagram();
    }
});

// Render initial diagram on load
window.addEventListener('load', () => {
    // Small delay to ensure Mermaid is loaded
    setTimeout(() => {
        renderDiagram();
    }, 100);
});
