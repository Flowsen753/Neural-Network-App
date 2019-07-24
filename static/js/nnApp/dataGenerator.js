let generate = {
  twoLines: async (numPoints) => {
    const [inputs, labels] = tf.tidy(() => {
      const halfPoints = Math.floor(numPoints/2)
      const xs = tf.linspace(0, 40, halfPoints)
      const xs_second = tf.linspace(40, 80, halfPoints)
      const firstLine = tf.scalar(3).mul(xs).add(tf.randomNormal([xs.size], 0, 8))
        .add(tf.scalar(30));
      const secondLine = tf.scalar(1).mul(xs_second).add(tf.randomNormal([xs_second.size], 0, 8))
      return [xs.concat(xs_second).dataSync(), firstLine.concat(secondLine).dataSync()]
    })
    return Array.from(inputs).map((input, i) => {
      return {x: input, y: labels[i]}
    })
  },

  sinewave: async (numPoints) => {
    const [inputs, labels] = tf.tidy(() => {
      const xs = tf.linspace(0, 6*Math.PI, numPoints)
      const wave = tf.scalar(30).mul(xs.sin()).add(tf.randomNormal([xs.size], 0, 8))
      return [xs.dataSync(), wave.dataSync()]; 
    })
    return Array.from(inputs).map((input, i) => {
      return {x: input, y: labels[i]}
    }) 
  },

  cloud: async () => {
    const dataSet_req = await fetch('https://storage.googleapis.com/tfjs-tutorials/carsData.json');  
	const dataSet_raw = await dataSet_req.json();
    const dataSet = dataSet_raw.map(car => ({
      x: car.Miles_per_Gallon,
      y: car.Horsepower,
    })).filter(car => (car.x != null && car.y != null));
	return dataSet
  },

  localData: (array) => {
	return array.map((set, i) => {
		return {x: set[0], y: set[1]}
	})
  },
}