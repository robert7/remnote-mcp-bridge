import { renderWidget } from '@remnote/plugin-sdk';

const randomNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'];
const randomName = randomNames[Math.floor(Math.random() * randomNames.length)];
const randomLikesPizza = Math.random() > 0.5;
const randomNumber = Math.floor(Math.random() * 100) + 1;

export const SamplePizzaWidget = () => {
  return (
    <div className="p-2 m-2 rounded-lg rn-clr-background-light-positive rn-clr-content-positive">
      <h1 className="text-xl">Pizza Plugin</h1>
      <div>
        Hi {randomName}, you {randomLikesPizza ? 'do' : "don't"} like pizza and your favorite number
        is {randomNumber}!
      </div>
    </div>
  );
};

renderWidget(SamplePizzaWidget);
