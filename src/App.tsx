import React, { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
import { Button, Input } from "@aws-amplify/ui-react";

const client = generateClient<Schema>();

function App() {
  const [todos, setTodos] = useState<Array<Schema["Todo"]["type"]>>([]);
  const [user, setUser] = useState<Schema["User"]["type"] | null>(null);
  const [enteredUserName, setEnteredUserName] = useState<string>("");

  useEffect(() => {
    const createUser = async () => {
      client.models.Todo.observeQuery().subscribe({
        next: (data) => setTodos([...data.items]),
      });
      const createdUserResponse = await client.models.User.create({ name: null });
      setUser(createdUserResponse.data);
    }
    createUser();
  }, []);

  function createTodo() {
    client.models.Todo.create({ content: window.prompt("Todo content") });
  }

  const updateUserName = async () => {
    if (user === null) {
      console.error("user === null");
      return;
    }
    const updatedUserResponse = await client.models.User.update({
      id: user.id,
      name: enteredUserName,
    });
    setUser(updatedUserResponse.data);
  };

  return (
    <main>
      <h1>{`User ID: ${user?.id}`}</h1>
      <h1>{`User name: ${user?.name}`}</h1>
      <Input onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEnteredUserName(e.target.value)} />
      <Button onClick={updateUserName}>Update user name</Button>
      <h1>My todos</h1>
      <button onClick={createTodo}>+ new</button>
      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>{todo.content}</li>
        ))}
      </ul>
      <div>
        🥳 App successfully hosted. Try creating a new todo.
        <br />
        <a href="https://docs.amplify.aws/react/start/quickstart/#make-frontend-updates">
          Review next step of this tutorial.
        </a>
      </div>
    </main>
  );
}

export default App;
