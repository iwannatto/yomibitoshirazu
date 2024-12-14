import React, { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
import { Button, Flex, Input, View } from "@aws-amplify/ui-react";

const client = generateClient<Schema>();

type User = Schema["User"]["type"];
type Room = Schema["Room"]["type"];
type Senryu = Schema["Senryu"]["type"];
type Character = Schema["Character"]["type"];

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
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        backgroundColor: "#ff9900",
        color: "white",
        padding: "1rem",
        textAlign: "center",
        zIndex: 1000, // 他の要素よりも上に表示する
      }}
    >
      <p style={{ margin: 0 }}>{`User ID: ${user?.id}`}</p>
      <p style={{ margin: 0 }}>{`User name: ${user?.name}`}</p>
      <Flex style={{ alignItems: "center" }}>
        <Input
          style={{ height: "2rem", marginRight: "1rem" }}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setEnteredUserName(e.target.value)
          }
        />
        <Button onClick={updateUserName}>ユーザー名のセット</Button>
      </Flex>
      <p style={{ margin: 0 }}>{`Room name: ${room?.name}`}</p>
    </View>
  );
};

const Rooms = ({
  user,
  setUser,
  setRoom,
}: {
  user: User;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  setRoom: React.Dispatch<React.SetStateAction<Room | null>>;
}) => {
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
    if (room.locked) {
      alert("この部屋はゲーム中です");
      return;
    }
    const { data: updatedUser } = await client.models.User.update({
      id: user.id,
      roomId: room.id,
    });
    setUser(updatedUser);
    setRoom(room);
  };

  const deleteRoom = async (room: Room) => {
    if (room.locked) {
      const forceDelete = confirm(
        "この部屋はゲーム中ですが、本当に削除しますか？"
      );
      if (!forceDelete) {
        return;
      }
    }
    await client.models.Room.delete({ id: room.id });
    setRooms((await client.models.Room.list()).data);
  };

  const createRoom = async () => {
    if (enteredRoomName === "") {
      alert("部屋名を入力してください");
      return;
    }

    await client.models.Room.create({
      name: enteredRoomName,
      locked: false,
      currentIndex: 0,
      order: [],
      completedUserIds: [],
    });
    setRooms((await client.models.Room.list()).data);
  };

  return (
    <View>
      <h2>Rooms</h2>
      <ul>
        {rooms.map((room) => (
          <li key={room.id}>
            <Button
              onClick={() => enterRoom(room)}
            >{`Enter room "${room.name}"`}</Button>
            <Button onClick={() => deleteRoom(room)}>x</Button>
          </li>
        ))}
      </ul>
      <Input
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setEnteredRoomName(e.target.value)
        }
      />
      <Button onClick={createRoom}>部屋を作成</Button>
    </View>
  );
};

const CurrentSenryu = ({ user, room }: { user: User; room: Room }) => {
  const [senryu, setSenryu] = useState<Senryu | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);

  useEffect(() => {
    const fetchSenryu = async () => {
      const { data: senryus } = await room.senryus();
      if (senryus.length === 0) {
        return;
      }
      const senryu = senryus.find((senryu) => senryu.currentUserId === user.id);
      if (senryu == undefined) {
        console.error("senryu == undefined");
        return;
      }
      setSenryu(senryu);
    };
    fetchSenryu();

    const intervalId = setInterval(fetchSenryu, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [room, user.id]);

  useEffect(() => {
    const fetchCharacters = async () => {
      if (senryu == null) {
        return;
      }
      const { data: characters } = await senryu.characters();
      setCharacters(characters);
    };
    fetchCharacters();
  }, [senryu]);

  const copiedCharacters = [...characters];
  copiedCharacters.sort((a, b) => a.index - b.index);
  const row1 = copiedCharacters.slice(0, 5);
  const row2 = copiedCharacters.slice(5, 12);
  const row3 = copiedCharacters.slice(12, 17);
  const rowTodisplayRow = (row: Character[]) => {
    return row.map((character) => character.character).join("");
  };
  const displayRow1 = rowTodisplayRow(row1);
  const displayRow2 = rowTodisplayRow(row2);
  const displayRow3 = rowTodisplayRow(row3);

  return (
    <>
      <p style={{ margin: 0 }}>{displayRow1}</p>
      <p style={{ margin: 0 }}>{displayRow2}</p>
      <p style={{ margin: 0 }}>{displayRow3}</p>
    </>
  );
};

const EnterNewCharacter = ({
  user,
  room,
  setRoom,
}: {
  user: User;
  room: Room;
  setRoom: React.Dispatch<React.SetStateAction<Room | null>>;
}) => {
  const [enteredCharacter, setEnteredCharacter] = useState<string>("");

  const submit = async () => {
    const { data: latestRoom } = await client.models.Room.get({ id: room.id });
    if (latestRoom == null) {
      console.error("latestRoom == null");
      return;
    }
    setRoom(latestRoom);
    const { data: updatedRoom } = await client.models.Room.update({
      id: latestRoom.id,
      completedUserIds: [...latestRoom.completedUserIds, user.id],
    });
    if (updatedRoom == null) {
      console.error("updatedRoom == null");
      return;
    }

    const { data: senryus } = await updatedRoom.senryus();
    const senryu = senryus.find((senryu) => senryu.currentUserId === user.id);
    if (senryu == undefined) {
      console.error("senryu == undefined");
      return;
    }

    const character = {
      senryuId: senryu.id,
      character: enteredCharacter,
      index: updatedRoom.currentIndex,
      userId: user.id,
    };
    await client.models.Character.create(character);

    setRoom(updatedRoom);

    if (updatedRoom.completedUserIds.length === updatedRoom.order.length) {
      const { data: updatedUpdatedRoom } = await client.models.Room.update({
        id: updatedRoom.id,
        currentIndex: updatedRoom.currentIndex + 1,
        completedUserIds: [],
      });
      if (updatedUpdatedRoom == null) {
        console.error("updatedUpdatedRoom == null");
        return;
      }

      const promises = senryus.map((senryu) => {
        const orderIndex = updatedUpdatedRoom.order.indexOf(
          senryu.currentUserId
        );
        if (orderIndex === -1) {
          console.error("orderIndex === -1");
          return;
        }
        const nextUserId =
          updatedUpdatedRoom.order[
            (orderIndex + 1) % updatedUpdatedRoom.order.length
          ];
        if (nextUserId == null) {
          console.error("nextUserId == null");
          return;
        }
        return client.models.Senryu.update({
          id: senryu.id,
          currentUserId: nextUserId,
        });
      });
      await Promise.all(promises);

      setRoom(updatedUpdatedRoom);
    }
  };

  return room.currentIndex === 17 ? (
    <p>Completed!</p>
  ) : room.completedUserIds.includes(user.id) ? (
    <p>Please wait...</p>
  ) : (
    <>
      <Input
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setEnteredCharacter(e.target.value)
        }
      />
      <Button onClick={submit}>文字を提出</Button>
    </>
  );
};

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]; // 元の配列を変更しないようコピーを作成
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1)); // ランダムなインデックスを選択
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; // 要素を交換
  }
  return shuffled;
}

const Game = ({
  user,
  room,
  setRoom,
}: {
  user: User;
  room: Room;
  setRoom: React.Dispatch<React.SetStateAction<Room | null>>;
}) => {
  const [usersInRoom, setUsersInRoom] = useState<User[]>([]);

  useEffect(() => {
    const subOfUser = client.models.User.observeQuery().subscribe({
      next: ({ items: users }) => {
        users = users.filter((user) => user.roomId === room.id);
        setUsersInRoom(users);
      },
    });
    const subOfRoom = client.models.Room.observeQuery({
      filter: { id: { eq: room.id } },
    }).subscribe({
      next: ({ items: rooms }) => {
        setRoom(rooms[0]);
      },
    });
    return () => {
      subOfUser.unsubscribe();
      subOfRoom.unsubscribe();
    };
  }, [room.id, setRoom]);

  const removeUser = async (user: User) => {
    if (room.locked) {
      return;
    }
    await client.models.User.update({
      id: user.id,
      roomId: null,
    });
  };

  const startGame = async () => {
    const { data: latestRoom } = await client.models.Room.get({ id: room.id });
    if (latestRoom == null) {
      console.error("latestRoom == null");
      return;
    }
    if (latestRoom.locked) {
      return;
    }
    await client.models.Room.update({
      id: latestRoom.id,
      locked: true,
    });

    const userIds = usersInRoom.map((user) => user.id);
    const order = shuffleArray(userIds);
    const { data: updatedRoom } = await client.models.Room.update({
      id: room.id,
      order,
    });
    if (updatedRoom == null) {
      console.error("updatedRoom == null");
      return;
    }
    setRoom(updatedRoom);

    const promises = order.map((userId) => {
      return client.models.Senryu.create({
        roomId: room.id,
        currentUserId: userId,
      });
    });
    await Promise.all(promises);
  };

  return (
    <>
      <ul>
        {usersInRoom.map((user) => (
          <li key={user.id} onClick={() => removeUser(user)}>
            {user.name}
            {room.locked ? "" : ": クリックでプレイヤー削除"}
          </li>
        ))}
      </ul>
      {room.locked || <Button onClick={startGame}>ゲーム開始</Button>}
      {room.locked && <CurrentSenryu user={user} room={room} />}
      {room.locked && (
        <EnterNewCharacter user={user} room={room} setRoom={setRoom} />
      )}
    </>
  );
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [room, setRoom] = useState<Room | null>(null);

  useEffect(() => {
    const createUser = async () => {
      const createdUserResponse = await client.models.User.create({
        name: null,
      });
      setUser(createdUserResponse.data);
    };
    createUser();
  }, []);

  return (
    <main>
      <Header user={user} setUser={setUser} room={room} />
      {user !== null && room === null && (
        <Rooms user={user} setUser={setUser} setRoom={setRoom} />
      )}
      {user !== null && room !== null && (
        <Game user={user} room={room} setRoom={setRoom} />
      )}
    </main>
  );
}

export default App;
