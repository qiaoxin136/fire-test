import { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
import FireTestMap from "./components/FireTestMap";
import FireTestPanel from "./components/FireTestPanel";

const client = generateClient<Schema>();

function App() {
  const [fireTests, setFireTests] = useState<Array<Schema["FireTest"]["type"]>>([]);

  useEffect(() => {
    const sub = client.models.FireTest.observeQuery().subscribe({
      next: ({ items }) => setFireTests([...items]),
    });
    return () => sub.unsubscribe();
  }, []);

  return (
    <div className="app-layout">
      <FireTestPanel fireTests={fireTests} />
      <div className="map-container">
        <FireTestMap fireTests={fireTests} />
      </div>
    </div>
  );
}

export default App;
