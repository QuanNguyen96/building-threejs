import React, { useState, useMemo, useRef, useEffect } from "react";
// useMemo : giong computed
function usePrevious(value) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}
function MyComponent() {
  const [message, setMessage] = useState("Hello React!");
  const [count, setcount] = useState(0);
  const oldCount = useRef();
  const countUseRef = useRef(0);
  const [arrayT, setarrayT] = useState([]);
  const prevCount = usePrevious(count);
  // useMemo tính countWithUseMemo dựa trên count, ví dụ nhân 2
  const countWithUseMemo = useMemo(() => {
    return count;
  }, [count]);

  // useMemo tính arrayTWithUseMemo là mảng đã được sort (ví dụ)
  const arrayTWithUseMemo = useMemo(() => {
    return [...arrayT].sort((a, b) => a - b);
  }, [arrayT]);

  const handleClick = () => {
    setMessage("Bạn đã click rồi!");
  };
  function handleClickCount() {
    let countT = count;
    countT++;
    console.log("cick", countT);
    setcount(count + 1);
    setcount(count + 1);
    countUseRef.current++;
    countUseRef.current++;
  }
  function getRandomIntRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  function handleClickArray() {
    let arr = [];
    for (let i = 0; i < 5; i++) {
      let rd = getRandomIntRange(0, 10);
      arr.push(rd);
    }
    setarrayT(arr);
  }
  useEffect(() => {
    oldCount.current = count;
    console.log("count", count);
    console.log("oldCount", oldCount);
  }, [count]);
  const logoldcount = () => {
    console.log("oldCount", oldCount);
    console.log("prevCount", prevCount);
  };
  return (
    <div>
      <p>{message}</p>
      <div>count={count}</div>
      <div>prevCount={prevCount}</div>
      <div>oldCount.current={oldCount.current}</div>
      <div>countUseRef={countUseRef.current}</div>
      <div>countWithUseMemo={countWithUseMemo}</div>
      <div>arrayT={arrayT}</div>
      <div>arrayTWithUseMemo={arrayTWithUseMemo}</div>
      <button onClick={handleClick}>Click me change message</button>
      <button onClick={handleClickCount}>count ++</button>
      <button onClick={handleClickArray}>change array</button>
      <button onClick={logoldcount}>log xem oldCount</button>
    </div>
  );
}

export default MyComponent;
