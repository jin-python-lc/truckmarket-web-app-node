CreatorModel.updateOne(
    { name: `${req.session.creator.name}` },
    {
        $push:
        {
            trucks:
                { title: req.body.title, category: req.body.category, artist: req.session.creator.name, image: req.files[0].key, m4a: req.files[1].key }
        }
    },
    //{ upsert: false }, 
    function (err) {
        if (err) {
            res.send(err);
            console.log(err);
        }
    }
)
Truck.find({
    'trucks.0': { $exists: true },
})