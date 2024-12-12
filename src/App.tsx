import React, { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
import { Button, Flex, Input, View } from "@aws-amplify/ui-react";

const client = generateClient<Schema>();

type User = Schema["User"]["type"];
type Room = Schema["Room"]["type"];

const Header = ({
  user,
  setUser,
  room,
}: {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  room: Room | null;
}) => {
  const [enteredUserName, setEnteredUserName] = useState<string>("");

  const updateUserName = async () => {
    if (user == null) {
      console.error("user == null");
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
      <p style={{ margin: 0 }}>{`Room name: ${room?.name}`}</p>
    </View>
  );
};

const Rooms = ({ user, setRoom }: { user: User; setRoom: React.Dispatch<React.SetStateAction<Room | null>> }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [enteredRoomName, setEnteredRoomName] = useState<string>("");

  useEffect(() => {
    const sub = client.models.Room.observeQuery().subscribe({
      next: ({ items: rooms }) => {
        setRooms(rooms);
      },
    });
    return () => {
      sub.unsubscribe();
    };
  }, []);

  const enterRoom = async (room: Room) => {
    await client.models.User.update({
      id: user.id,
      roomId: room.id,
    });
    setRoom(room);
  };

  const createRoom = async () => {
    if (enteredRoomName === "") {
      alert("部屋名を入力してください");
      return;
    }

    await client.models.Room.create({ name: enteredRoomName });
    return;
  }

  return (
    <View>
      <h2>Rooms</h2>
      <ul>
        {rooms.map((room) => (
          <li key={room.id}>
            <Button onClick={() => enterRoom(room)}>{`Enter room "${room.name}"`}</Button>
          </li>
        ))}
      </ul>
      <Input onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEnteredRoomName(e.target.value)} />
      <Button onClick={createRoom}>部屋を作成</Button>
    </View>
  );
};

const Game = ({ user, room }: { user: User; room: Room }) => {
  const [usersInRoom, setUsersInRoom] = useState<User[]>([]);

  useEffect(() => {
    const sub = client.models.User.observeQuery().subscribe({
      next: ({ items: users }) => {
        users = users.filter((user) => user.roomId === room.id);
        setUsersInRoom(users);
      },
    });
    return () => {
      sub.unsubscribe();
    };
  }, [room.id]);

  const removeUser = async (user: User) => {
    await client.models.User.update({
      id: user.id,
      roomId: null,
    });
  };

  return (
    <ul>
      {usersInRoom.map((user) => (
        <li key={user.id} onClick={() => removeUser(user)}>{user.name} クリックでユーザー削除</li>
      ))}
    </ul>
  );
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [room, setRoom] = useState<Room | null>(null);

  useEffect(() => {
    const createUser = async () => {
      const createdUserResponse = await client.models.User.create({ name: null });
      setUser(createdUserResponse.data);
    }
    createUser();
  }, []);

  return (
    <main>
      <Header user={user} setUser={setUser} room={room} />
      {user !== null && room === null && <Rooms user={user} setRoom={setRoom} />}
      {user !== null && room !== null && <Game user={user} room={room} />}
    </main>
  );
}

export default App;
