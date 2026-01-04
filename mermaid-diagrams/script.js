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
    commit`,

    // Project Diagrams
    'cvss-converter': `graph TD
    A[Start: Select CVSS Version] --> B{Version?}
    B -->|v3.x| C[Input v3 Metrics]
    B -->|v4.0| D[Input v4 Metrics]
    C --> E[Calculate Base Score]
    D --> F[Calculate v4 Score]
    E --> G{Convert?}
    F --> H{Convert?}
    G -->|Yes| I[Map v3 to v4 Metrics]
    H -->|Yes| J[Map v4 to v3 Metrics]
    I --> K[Generate v4 Vector]
    J --> L[Generate v3 Vector]
    K --> M[Display Results]
    L --> M
    G -->|No| M
    H -->|No| M
    M --> N[End]

    style A fill:#3498db,stroke:#2980b9,color:#fff
    style M fill:#27ae60,stroke:#229954,color:#fff
    style N fill:#95a5a6,stroke:#7f8c8d,color:#fff`,

    'tls-toolkit': `sequenceDiagram
    participant Client
    participant Server

    Client->>Server: ClientHello<br/>(Supported ciphers, TLS version, extensions)
    Note over Client,Server: Client initiates connection

    Server->>Client: ServerHello<br/>(Selected cipher, TLS version)
    Server->>Client: Certificate<br/>(Server certificate chain)
    Server->>Client: CertificateVerify<br/>(Proves ownership of private key)
    Server->>Client: Finished<br/>(Encrypted handshake hash)
    Note over Client,Server: Server authentication complete

    Client->>Server: Finished<br/>(Encrypted handshake hash)
    Note over Client,Server: Session keys established

    Client->>Server: Application Data (Encrypted)
    Server->>Client: Application Data (Encrypted)
    Note over Client,Server: Secure communication active`,

    'network-scanner': `graph LR
    A[User] --> B{Select Scan Type}
    B -->|WiFi| C[WiFi Scanner API]
    B -->|Bluetooth| D[Web Bluetooth API]
    B -->|Radar| E[Combined View]

    C --> F[Detect Networks]
    F --> G[Analyze SSID]
    F --> H[Measure Signal Strength]
    F --> I[Check Security Type]

    D --> J[Request Permission]
    J --> K[Scan BLE Devices]
    K --> L[Read Device Info]

    E --> M[Merge Data Sources]
    M --> N[Calculate Positions]
    N --> O[Render Radar]

    G --> P[Display Results]
    H --> P
    I --> P
    L --> P
    O --> P

    style A fill:#667eea,stroke:#5568d3,color:#fff
    style P fill:#27ae60,stroke:#229954,color:#fff
    style C fill:#3498db,stroke:#2980b9,color:#fff
    style D fill:#9b59b6,stroke:#8e44ad,color:#fff`,

    'arxiv-scraper': `graph TD
    A[GitHub Actions Trigger] -->|Daily Schedule| B[Scrape ArXiv API]
    B --> C{Filter Categories}
    C -->|AI/ML| D[cs.AI, cs.LG]
    C -->|Security| E[cs.CR, cs.SE]
    D --> F[Collect Papers]
    E --> F
    F --> G[Apply Filters]
    G --> H[Score Relevance]
    H --> I[Select Top Paper]
    I --> J[Extract Metadata]
    J --> K[Format Paper Data]
    K --> L[Update papers.json]
    L --> M[Commit Changes]
    M --> N[Deploy to GitHub Pages]
    N --> O[Display on Website]

    style A fill:#667eea,stroke:#5568d3,color:#fff
    style O fill:#27ae60,stroke:#229954,color:#fff
    style I fill:#f39c12,stroke:#e67e22,color:#fff`,

    'scifi-generator': `graph TD
    A[GitHub Actions] -->|Scheduled Trigger| B[AI Story Generator]
    B --> C{Story Type}
    C -->|Opening| D[Analyze 80+ Award Winners]
    C -->|Ending| E[Study Narrative Conclusions]
    D --> F[Generate Opening Page]
    E --> G[Generate Ending Page]
    F --> H[Cache Story]
    G --> H
    H --> I[Save to JSON]
    I --> J[Deploy to GitHub Pages]
    J --> K[User Visits Site]
    K --> L{Select Type}
    L -->|Opening| M[Load Random Opening]
    L -->|Ending| N[Load Random Ending]
    M --> O[Display Story]
    N --> O

    style A fill:#667eea,stroke:#5568d3,color:#fff
    style O fill:#27ae60,stroke:#229954,color:#fff
    style B fill:#9b59b6,stroke:#8e44ad,color:#fff`,

    'weird-science': `graph TD
    A[Weekly GitHub Action] --> B[Claude AI: Generate Weird Fact]
    B --> C[Claude AI: Fact Check]
    C --> D{Is Accurate?}
    D -->|No| E[Regenerate]
    E --> B
    D -->|Yes| F[Claude AI: Create Image Prompt]
    F --> G[Claude AI: Generate SVG Illustration]
    G --> H[Combine Fact + Verification + Image]
    H --> I[Save to Cache JSON]
    I --> J[Deploy to GitHub Pages]
    J --> K[User Clicks Button]
    K --> L[Load Random Cached Fact]
    L --> M[Display Fact + Image]

    style A fill:#667eea,stroke:#5568d3,color:#fff
    style M fill:#27ae60,stroke:#229954,color:#fff
    style C fill:#f39c12,stroke:#e67e22,color:#fff
    style G fill:#9b59b6,stroke:#8e44ad,color:#fff`,

    'als-aggregator': `graph TD
    A[Weekly GitHub Action] --> B[Fetch ALS News Sources]
    B --> C[PubMed API]
    B --> D[Clinical Trials API]
    B --> E[News Sources]
    C --> F[Collect Articles]
    D --> F
    E --> F
    F --> G[Filter for Relevance]
    G --> H[AI Summarization]
    H --> I[Categorize Content]
    I --> J{Type?}
    J -->|Research| K[Research Section]
    J -->|Clinical| L[Clinical Trials]
    J -->|News| M[News Section]
    J -->|Local| N[NJ Resources]
    K --> O[Compile Weekly Digest]
    L --> O
    M --> O
    N --> O
    O --> P[Deploy to GitHub Pages]

    style A fill:#667eea,stroke:#5568d3,color:#fff
    style P fill:#27ae60,stroke:#229954,color:#fff
    style H fill:#f39c12,stroke:#e67e22,color:#fff`,

    'blog-workflow': `graph LR
    A[Write Markdown Post] --> B[Add Front Matter]
    B --> C[Commit to Git]
    C --> D[Push to GitHub]
    D --> E[GitHub Actions]
    E --> F[Jekyll Build]
    F --> G{Build Success?}
    G -->|No| H[Check Errors]
    H --> A
    G -->|Yes| I[Generate Static HTML]
    I --> J[Compile CSS/JS]
    J --> K[Create Site Structure]
    K --> L[Deploy to GitHub Pages]
    L --> M[Site Live]

    style A fill:#667eea,stroke:#5568d3,color:#fff
    style M fill:#27ae60,stroke:#229954,color:#fff
    style F fill:#f39c12,stroke:#e67e22,color:#fff`
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
