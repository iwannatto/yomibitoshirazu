import React, { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
import { Button, Flex, Input, View } from "@aws-amplify/ui-react";

const client = generateClient<Schema>();

type User = Schema["User"]["type"];

const Header = ({
  user,
  setUser
}: {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>
}) => {
  const [enteredUserName, setEnteredUserName] = useState<string>("");

  const updateUserName = async () => {
    if (user === null) {
      console.error("user === null");
      return;
    }
    const { data: updatedUser } = await client.models.User.update({
      id: user.id,
      name: enteredUserName,
    });
    setUser(updatedUser);
  };

  return (
    <View
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        backgroundColor: '#ff9900',
        color: 'white',
        padding: '1rem',
        textAlign: 'center',
        zIndex: 1000, // 他の要素よりも上に表示する
      }}
    >
      <p style={{ margin: 0 }}>{`User ID: ${user?.id}`}</p>
      <p style={{ margin: 0 }}>{`User name: ${user?.name}`}</p>
      <Flex style={{ alignItems: "center" }}>
        <Input
          style={{ height: '2rem', marginRight: '1rem' }}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEnteredUserName(e.target.value)} />
        <Button onClick={updateUserName}>ユーザー名のセット</Button>
      </Flex>
    </View>
  );
};

function App() {
  const [todos, setTodos] = useState<Array<Schema["Todo"]["type"]>>([]);
  const [user, setUser] = useState<User | null>(null);

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

  return (
    <main>
      <Header user={user} setUser={setUser} />
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
