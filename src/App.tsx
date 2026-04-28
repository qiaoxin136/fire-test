import { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";

const client = generateClient<Schema>();

function App() {
  const [fireTests, setFireTests] = useState<Array<Schema["FireTest"]["type"]>>([]);

  useEffect(() => {
    client.models.FireTest.observeQuery().subscribe({
      next: (data) => setFireTests([...data.items]),
    });
  }, []);

  function createFireTest() {
    client.models.FireTest.create({ content: window.prompt("FireTest content") });
  }

  return (
    <main>
      <h1>My FireTests</h1>
      <button onClick={createFireTest}>+ new</button>
      <ul>
        {fireTests.map((fireTest) => (
          <li key={fireTest.id}>{fireTest.content}</li>
        ))}
      </ul>
      <div>
        🥳 App successfully hosted. Try creating a new FireTest.
        <br />
        <a href="https://docs.amplify.aws/react/start/quickstart/#make-frontend-updates">
          Review next step of this tutorial.
        </a>
      </div>
    </main>
  );
}

export default App;
