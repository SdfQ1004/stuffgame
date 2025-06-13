// client/src/components/GameEndSummary.jsx
import React from 'react';
import CardDisplay from './CardDisplay'; // Assuming it's in the same directory
import { Row, Col } from 'react-bootstrap'; // Don't forget these imports

function GameEndSummary({ wonCards, outcome }) {
  return (
    <div>
      <h2>Game Over! Outcome: {outcome}</h2>
      {wonCards.length > 0 ? (
        <>
          <h3>Cards You Won:</h3>
          <Row className="justify-content-center">
            {wonCards.map(card => (
              <Col key={card.id} xs="auto">
                <CardDisplay card={card} showIndex={true} />
              </Col>
            ))}
          </Row>
        </>
      ) : (
        <p>You didn't win any cards this game.</p>
      )}
    </div>
  );
}

export default GameEndSummary;